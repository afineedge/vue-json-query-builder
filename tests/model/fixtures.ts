import type { FieldDef } from '../../src/model'

export const fields: FieldDef[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'price', label: 'Price', type: 'number' },
  { field: 'date', label: 'Date', type: 'date' },
  { field: 'time', label: 'Time', type: 'time' },
  {
    field: 'state',
    label: 'State',
    type: 'select',
    options: [
      { value: 'MD', label: 'Maryland' },
      { value: 'VA', label: 'Virginia' },
    ],
  },
  {
    field: 'tags',
    label: 'Tags',
    type: 'select',
    multiValued: true,
    options: [
      { value: 'new', label: 'New' },
      { value: 'sale', label: 'Sale' },
    ],
  },
]

export const field = (name: string): FieldDef => fields.find((f) => f.field === name)!

/** The query from the 0.1.x demo app (src/App.vue on master). */
export const v0DemoQuery = {
  condition: 'and',
  rules: [
    { id: 'state', operator: '=', value: 'MD' },
    {
      condition: 'and',
      rules: [
        { id: 'owner', operator: '!=', value: 0 },
        { id: 'price', operator: '<=', value: 80000 },
      ],
    },
  ],
}
