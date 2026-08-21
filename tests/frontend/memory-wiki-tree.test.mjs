import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MemoryWikiTree from '../../src/renderer/components/MemoryWikiTree.vue'

function makePage(id, pageType, title, status = 'active') {
  return { id, pageId: id, pageType, title, status }
}

const pages = [
  makePage('p1', 'identity_profile', '我的身份页'),
  makePage('p2', 'identity_person', '钟奕菲'),
  makePage('p3', 'topic', '主题页'),
  makePage('p4', 'event', '老事件'),
  makePage('p5', 'identity_person', '阿哲', 'archived')
]

describe('T-01 文件树组件', () => {
  it('树结构：身份 4 类在前、普通类型、已归档最后', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { pages } })
    const dirs = wrapper.findAll('.treeDirLabel').map((n) => n.text())
    expect(dirs[0]).toBe('关于你')
    expect(dirs[1]).toBe('重要的人')
    expect(dirs[2]).toBe('你的偏好')
    expect(dirs[3]).toBe('你的特征')
    expect(dirs[4]).toBe('事件')
    expect(dirs[5]).toBe('主题')
    expect(dirs[dirs.length - 1]).toBe('已归档')
  })

  it('默认展开身份 4 类，普通类型折叠；文件显示在展开目录下', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { pages } })
    // 身份目录展开：文件可见
    const files = wrapper.findAll('.treeFileLabel').map((n) => n.text())
    expect(files).toContain('我的身份页')
    expect(files).toContain('钟奕菲')
    // 主题折叠：文件不可见（展开事件）——默认普通类型折叠，需点击展开
    expect(files).not.toContain('主题页')
    // 展开主题目录
    const topicDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('主题'))
    await topicDir.trigger('click')
    const afterFiles = wrapper.findAll('.treeFileLabel').map((n) => n.text())
    expect(afterFiles).toContain('主题页')
  })

  it('受控 expandedKeys 模式：目录点击 emit toggle 且不改变内部状态', async () => {
    const wrapper = mount(MemoryWikiTree, {
      props: { pages, expandedKeys: ['identity_profile'] }
    })
    const topicDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('主题'))
    await topicDir.trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')[0][0]).toBe('topic')
    // 受控模式下内部不展开
    expect(wrapper.findAll('.treeFileLabel').map((n) => n.text())).not.toContain('主题页')
  })

  it('文件点击 emit select 且选中高亮', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { pages, selectedId: 'p1' } })
    const activeFile = wrapper.find('.treeFile.active')
    expect(activeFile.exists()).toBe(true)
    expect(activeFile.text()).toContain('我的身份页')

    const personFile = wrapper.findAll('.treeFile').find((n) => n.text().includes('钟奕菲'))
    await personFile.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0].id).toBe('p2')
  })

  it('已归档目录灰显，文件可点击', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { pages } })
    // 展开已归档目录
    const archivedDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('已归档'))
    await archivedDir.trigger('click')

    const archivedFile = wrapper.findAll('.treeFile').find((n) => n.text().includes('阿哲'))
    expect(archivedFile.exists()).toBe(true)
    expect(archivedFile.classes()).toContain('archived')

    await archivedFile.trigger('click')
    expect(wrapper.emitted('select')[0][0].id).toBe('p5')
  })

  it('空目录显示（空）占位', async () => {
    const wrapper = mount(MemoryWikiTree, { props: { pages } })
    const preferenceDir = wrapper.findAll('.treeDir').find((n) => n.text().includes('你的偏好'))
    expect(preferenceDir.text()).toContain('（空）')
  })
})
