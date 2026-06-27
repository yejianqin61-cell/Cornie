import { getRuntimeTmpRoot, listRootTmpSqliteArtifacts, listRuntimeTmpArtifacts } from './tmp-artifacts.mjs'

const baselineCount = Number(process.env.CORNIE_ROOT_TMP_BASELINE_COUNT ?? '0')
const rootTmpArtifacts = listRootTmpSqliteArtifacts()
const runtimeTmpArtifacts = listRuntimeTmpArtifacts()
const newRootTmpArtifacts = rootTmpArtifacts.slice(baselineCount)

const report = {
  ok: newRootTmpArtifacts.length === 0,
  baselineCount,
  rootTmpArtifacts,
  newRootTmpArtifacts,
  runtimeTmpRoot: getRuntimeTmpRoot(),
  runtimeTmpArtifactsCount: runtimeTmpArtifacts.length
}

console.log(JSON.stringify(report, null, 2))

if (!report.ok) {
  process.exit(1)
}
