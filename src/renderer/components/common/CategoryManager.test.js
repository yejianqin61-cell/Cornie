import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryManager from './CategoryManager.vue'

const categories = [
  { id: 'c1', name: '餐饮', isActive: true, sortOrder: 1 },
  { id: 'c2', name: '交通', isActive: true, sortOrder: 2 },
  { id: 'c3', name: '旧类目', isActive: false, sortOrder: 3 },
]

function buttonsOf(wrapper, label) {
  return wrapper.findAll('button').filter((button) => button.text() === label)
}

describe('CategoryManager', () => {
  it('shows active and inactive categories with the right actions', () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    const text = wrapper.text()
    expect(text).toContain('餐饮')
    expect(text).toContain('交通')
    expect(text).toContain('旧类目')
    expect(text).toContain('已停用')
    expect(buttonsOf(wrapper, '停用')).toHaveLength(2)
    expect(buttonsOf(wrapper, '恢复')).toHaveLength(1)
  })

  it('emits create with the typed name', async () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    await wrapper.get('[data-testid="category-new-name"]').setValue('宠物')
    await buttonsOf(wrapper, '新增')[0].trigger('click')
    expect(wrapper.emitted('create')[0][0]).toMatchObject({ name: '宠物' })
  })

  it('shows move buttons only when reorderable', () => {
    const plain = mount(CategoryManager, { props: { categories, reorderable: false } })
    expect(buttonsOf(plain, '上移')).toHaveLength(0)
    expect(buttonsOf(plain, '下移')).toHaveLength(0)

    const sortable = mount(CategoryManager, { props: { categories, reorderable: true } })
    expect(buttonsOf(sortable, '上移').length).toBeGreaterThan(0)
    expect(buttonsOf(sortable, '下移').length).toBeGreaterThan(0)
  })

  it('shows the error text', () => {
    const wrapper = mount(CategoryManager, { props: { categories, error: '名称无效' } })
    expect(wrapper.text()).toContain('名称无效')
  })

  it('emits deactivate, restore and rename with the category id', async () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    await buttonsOf(wrapper, '停用')[0].trigger('click')
    expect(wrapper.emitted('deactivate')[0]).toEqual(['c1'])
    await buttonsOf(wrapper, '恢复')[0].trigger('click')
    expect(wrapper.emitted('restore')[0]).toEqual(['c3'])

    await buttonsOf(wrapper, '改名')[0].trigger('click')
    await wrapper.get('[data-testid="category-rename-input"]').setValue('餐厅')
    await buttonsOf(wrapper, '保存')[0].trigger('click')
    expect(wrapper.emitted('rename')[0]).toEqual([{ id: 'c1', name: '餐厅' }])
  })

  it('groups categories by type when types are given', () => {
    const typed = [
      { id: 'e1', name: '餐饮', isActive: true, sortOrder: 1, type: 'expense' },
      { id: 'i1', name: '工资', isActive: true, sortOrder: 1, type: 'income' },
    ]
    const wrapper = mount(CategoryManager, {
      props: {
        categories: typed,
        types: [
          { value: 'expense', label: '支出' },
          { value: 'income', label: '收入' },
        ],
      },
    })
    expect(wrapper.text()).toContain('支出')
    expect(wrapper.text()).toContain('收入')
    expect(wrapper.text()).toContain('餐饮')
    expect(wrapper.text()).toContain('工资')
  })
})
