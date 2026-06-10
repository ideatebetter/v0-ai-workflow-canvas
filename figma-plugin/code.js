// Ideate Figma Plugin — main thread
// Runs in Figma's sandbox: no fetch, no DOM. Communicates with ui.html via postMessage.

figma.showUI(__html__, { width: 340, height: 520, title: "Sync with Ideate" });

// Map of frameId → { canvasId, nodeId } for frames synced in this session
var syncedFrames = {};
var debounceTimer = null;

// Send current selection to UI on load
sendCurrentSelection();

function sendCurrentSelection() {
  var sel = figma.currentPage.selection;
  var frame = sel.length > 0 ? sel[0] : null;
  if (frame && (frame.type === "FRAME" || frame.type === "COMPONENT" || frame.type === "COMPONENT_SET" || frame.type === "GROUP")) {
    figma.ui.postMessage({ type: "selection", id: frame.id, name: frame.name });
  } else {
    figma.ui.postMessage({ type: "no-selection" });
  }
}

figma.on("selectionchange", function () {
  sendCurrentSelection();
});

// Messages from the UI
figma.ui.onmessage = function (msg) {

  if (msg.type === "export-frame") {
    // getNodeByIdAsync is required when documentAccess is "dynamic-page"
    figma.getNodeByIdAsync(msg.frameId).then(function (node) {
      if (!node) {
        figma.ui.postMessage({ type: "export-error", message: "Frame not found" });
        return;
      }
      if (typeof node.exportAsync !== "function") {
        figma.ui.postMessage({ type: "export-error", message: "Cannot export this node type" });
        return;
      }
      return node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } })
        .then(function (bytes) {
          figma.ui.postMessage({
            type: "frame-exported",
            bytes: Array.from(bytes),
            frameId: msg.frameId,
            frameName: node.name,
            canvasId: msg.canvasId,
            nodeId: msg.nodeId || null,
          });
        });
    }).catch(function (err) {
      figma.ui.postMessage({ type: "export-error", message: String(err) });
    });
  }

  if (msg.type === "sync-registered") {
    syncedFrames[msg.frameId] = { canvasId: msg.canvasId, nodeId: msg.nodeId };
    figma.notify("Synced to Ideate ✓", { timeout: 2000 });
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};

// documentchange requires loadAllPagesAsync first in incremental/dynamic-page mode
figma.loadAllPagesAsync().then(function () {
  figma.on("documentchange", function () {
    if (Object.keys(syncedFrames).length === 0) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var frameIds = Object.keys(syncedFrames);
      frameIds.forEach(function (frameId) {
        var info = syncedFrames[frameId];
        figma.getNodeByIdAsync(frameId).then(function (node) {
          if (!node || typeof node.exportAsync !== "function") return;
          return node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } })
            .then(function (bytes) {
              figma.ui.postMessage({
                type: "auto-sync",
                bytes: Array.from(bytes),
                frameId: frameId,
                frameName: node.name,
                canvasId: info.canvasId,
                nodeId: info.nodeId,
              });
            });
        }).catch(function () {});
      });
    }, 3000);
  });
});
