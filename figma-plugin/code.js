// Ideate Figma Plugin — main thread
// Runs in Figma's sandbox: no fetch, no DOM. Communicates with ui.html via postMessage.

figma.showUI(__html__, { width: 340, height: 520, title: "Sync with Ideate" });

// Map of frameId → { canvasId, nodeId } for frames synced in this session
var syncedFrames = {};
var debounceTimer = null;

// On load, send current selection to UI
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

// Re-send selection when it changes
figma.on("selectionchange", function () {
  sendCurrentSelection();
});

// Messages from the UI
figma.ui.onmessage = function (msg) {

  if (msg.type === "export-frame") {
    var node = figma.getNodeById(msg.frameId);
    if (!node) {
      figma.ui.postMessage({ type: "export-error", message: "Frame not found" });
      return;
    }
    if (typeof node.exportAsync !== "function") {
      figma.ui.postMessage({ type: "export-error", message: "Cannot export this node type" });
      return;
    }
    node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } })
      .then(function (bytes) {
        figma.ui.postMessage({
          type: "frame-exported",
          bytes: Array.from(bytes),
          frameId: msg.frameId,
          frameName: node.name,
          canvasId: msg.canvasId,
          nodeId: msg.nodeId || null,
        });
      })
      .catch(function (err) {
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

// documentchange requires all pages to be loaded first in incremental mode
figma.loadAllPagesAsync().then(function () {
  figma.on("documentchange", function () {
    if (Object.keys(syncedFrames).length === 0) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var frameIds = Object.keys(syncedFrames);
      for (var i = 0; i < frameIds.length; i++) {
        (function (frameId) {
          var info = syncedFrames[frameId];
          var node = figma.getNodeById(frameId);
          if (!node || typeof node.exportAsync !== "function") return;

          node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } })
            .then(function (bytes) {
              figma.ui.postMessage({
                type: "auto-sync",
                bytes: Array.from(bytes),
                frameId: frameId,
                frameName: node.name,
                canvasId: info.canvasId,
                nodeId: info.nodeId,
              });
            })
            .catch(function () {});
        })(frameIds[i]);
      }
    }, 3000);
  });
});
