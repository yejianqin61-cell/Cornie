import { clearRootTmpSqliteArtifacts } from './tmp-artifacts.mjs'

const removedCount = clearRootTmpSqliteArtifacts()

console.log(
  JSON.stringify(
    {
      removedCount
    },
    null,
    2
  )
)
