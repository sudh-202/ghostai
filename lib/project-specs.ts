export function getProjectSpecFilename(filePath: string) {
  try {
    const url = new URL(filePath)
    const filename = url.pathname.split("/").pop()

    if (filename) {
      return decodeURIComponent(filename)
    }
  } catch {
    const filename = filePath.split("/").pop()

    if (filename) {
      return decodeURIComponent(filename)
    }
  }

  return "spec.md"
}
