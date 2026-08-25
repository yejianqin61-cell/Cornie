export const cornieStage = { w: 420, h: 420 }

// 小窗展示用整体变换：缩放 + 平移（用于避免部件出界被裁切）
// scale=0.25 约等于“缩小 400%”（变为原来的 25%）
export const corniePetTransform = {
  scale: 0.25,
  // 由于部件边界与窗口裁切的视觉差异，做一个轻微的左移/下移让完整主体落在框内
  offsetX: -120,
  // 小窗内整体平移（在上一版基础上再下移 30px：-210 + 30 = -180）
  offsetY: -180,
}

// 由拼装编辑器导出并固化（version: 1）
export const cornieParts = [
  { id: 'tail1', x: 337, y: 314, scale: 0.54, rot: -160, opacity: 0.95, z: 0 },
  { id: 'body', x: 293, y: 197, scale: 1, rot: 0, opacity: 1, z: 1 },
  { id: 'head', x: 245, y: -35, scale: 1, rot: 0, opacity: 1, z: 4 },
  { id: 'ring', x: 396, y: 228, scale: 0.74, rot: 0, opacity: 1, z: 5 },
]

export const cornieCssVars = {
  '--tail1-x': '337px',
  '--tail1-y': '314px',
  '--tail1-s': '0.540',
  '--tail1-r': '-160.0deg',
  '--tail1-o': '0.950',
  '--tail1-z': '0',
  '--body-x': '293px',
  '--body-y': '197px',
  '--body-s': '1.000',
  '--body-r': '0.0deg',
  '--body-o': '1.000',
  '--body-z': '1',
  '--head-x': '245px',
  '--head-y': '-35px',
  '--head-s': '1.000',
  '--head-r': '0.0deg',
  '--head-o': '1.000',
  '--head-z': '4',
  '--ring-x': '396px',
  '--ring-y': '228px',
  '--ring-s': '0.740',
  '--ring-r': '0.0deg',
  '--ring-o': '1.000',
  '--ring-z': '5',
}

// 眨眼覆盖层（挂在 head 部件内，坐标系继承 head 的变换）
// 先给一组默认值，你可用 cornie.html?edit=1 编辑对齐后替换
export const cornieEyeOverlay = {
  x: 94,
  y: 143,
  w: 176,
  h: 124,
  rot: -1.2,
  opacity: 1,
}
