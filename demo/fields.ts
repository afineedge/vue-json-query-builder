import { migrateV0Query, type FieldDef } from '../src'
import { STATE_OPTIONS } from './states'

// The 0.1.x demo's fields in the v1 format: `id`/`name` become `field`/`label`, option
// `id`/`name` become `value`/`label`, and the old phone/email types become text inputs.
export const fields: FieldDef[] = [
  { field: 'price', label: 'Price', type: 'number', placeholder: 'Amount' },
  { field: 'date', label: 'Date', type: 'date' },
  { field: 'time', label: 'Time', type: 'time' },
  { field: 'state', label: 'State', type: 'select', options: STATE_OPTIONS },
  {
    field: 'owner',
    label: 'Owner',
    type: 'select',
    options: [
      { value: 0, label: 'Charles Smith' },
      { value: 1, label: 'Emmy Carlton' },
      { value: 2, label: 'Jim Bowmann' },
      { value: 4, label: 'Karla Entwisle' },
      { value: 5, label: 'Omar Warren' },
      { value: 6, label: 'Samantha Lowenstein' },
      { value: 7, label: 'Zachary Appleton' },
    ],
  },
  { field: 'phone', label: 'Phone', type: 'text', inputType: 'tel' },
  { field: 'email', label: 'Email', type: 'text', inputType: 'email' },
  // New in v1: a multi-valued select gets any_of / all_of / none_of.
  {
    field: 'amenities',
    label: 'Amenities',
    type: 'select',
    multiValued: true,
    options: [
      { value: 'garage', label: 'Garage' },
      { value: 'pool', label: 'Pool' },
      { value: 'yard', label: 'Yard' },
      { value: 'basement', label: 'Basement' },
      { value: 'fireplace', label: 'Fireplace' },
    ],
  },
]

/** The 0.1.x demo's starting query, converted with migrateV0Query. */
export const defaultQuery = migrateV0Query({
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
})
