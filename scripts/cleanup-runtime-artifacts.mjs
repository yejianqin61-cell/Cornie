import { clearLegacyRootTmpDirectories, clearRuntimeTmpRoot, listRuntimeTmpArtifacts } from './tmp-artifacts.mjs'

const before = listRuntimeTmpArtifacts()
const removedLegacyDirCount = clearLegacyRootTmpDirectories()
await clearRuntimeTmpRoot()

console.log(
  JSON.stringify(
    {
      removedCount: before.length,
      removedLegacyDirCount
    },
    null,
    2
  )
)
