import { DocumentFullView } from "@/components/atlas/documents/document-full-view"

interface Params {
  id: string
}

export default async function DocPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  return <DocumentFullView docId={id} />
}
