/* global it, describe, expect, jest */
const {observable, autorun, computed, action, extendObservable, reaction, when, isObservableArray} = require('mobx')
const {typeFilter, yes, no, handler, call, off, recheck, callRecheck} = require('type-filter')

let testIndex = 0

class Root {
  constructor () {
    this._destructors = new Set()
  }
  destructor () {

  }
  _destructor () {
    this._destructors.forEach(destructor => destructor())
    this.destructor()
  }
  $add (destructor) {
    this._destructors.add(destructor)
  }
  $del (destructor) {
    this._destructors.delete(destructor)
  }
  $new (constructor, ...args) {
    const result = new constructor(...args)
    const destructor = () => {
      result.destructor()
      this.$del(destructor)
    }
    this.$add(destructor)
    return result
  }
}
function toStr (value) {
  return value + ''
}
const stringHandler = {
  string: yes,
  function: callRecheck,
  number: toStr,
  boolean: toStr,
  other: () => ''
}
function toInteger (value) {
  return typeFilter(value, {
    string: () => parseInt(value),
    number: yes,
    boolean: () => value ? 1 : 0,
    other: () => 0
  })
}

const UNDEFINED = Symbol('UNDEFINED')
const newMap = (value, options) => options ? new Map() : () => new Map(value)

/** @typedef {*} root */

class Field {
  get defaultValue () {
    return this._defaultValue
  }
  set defaultValue (value) {
    this._defaultValue = value
  }

  /** @type {root|*} */
  @computed
  get value () {
    return typeFilter(this._value, [
      value => value === UNDEFINED ? this._defaultValue : value,
      value => value instanceof Field ? value.value : value,
      {
        function: callRecheck,
        other: this.formatter
      }
    ])
  }
  set value (value) {
    this._value = value
  }
  reset () {
    this._value = UNDEFINED
  }

  @computed
  /** @type {Function} */
  get formatter () {
    return typeFilter(this._formatter, handler)
  }
  set formatter (value) {
    const set = value => this._formatter = value
    typeFilter(value, {
      function: set,
      array: set,
      object: set
    })
  }

  @computed
  get isChanged () {
    return this._value !== UNDEFINED
  }

  @computed
  get error () {
    return this._error === UNDEFINED ? this.validator : this._error
  }
  set error (error) {
    this._error = error
  }
  clearError () {
    this._error = UNDEFINED
  }

  @computed
  get validator () {
    const values = this.values
    if (values.length) {
      const value = this.value
      for (const item of values) {
        if (typeFilter(item, {function: callRecheck}) === value) {
          return false
        }
      }
      return true
    } else {
      return typeFilter(this.value, this._validator, true)
    }
  }
  set validator (value) {
    const set = value => this._validator = value
    typeFilter(value, {
      function: set,
      object: set,
      array: set
    })
  }

  @computed
  get values () {
    return typeFilter(this._values, {
      array: yes,
      function: callRecheck,
      other: () => []
    })
  }
  set values (value) {
    const set = value => this._values = value
    typeFilter(value, {
      function: set,
      array: set
    })
  }

  @computed
  get label () {
    return typeFilter(this._label, stringHandler)
  }
  set label (value) {
    this._label = value
  }

  @computed
  get hint () {
    return typeFilter(this._hint, stringHandler)
  }
  set hint (value) {
    this._hint = value
  }

  /**
   * @param {Object} [options]
   * @param {Object} [other]
   * */
  constructor ({defaultValue, value = UNDEFINED, formatter, error = UNDEFINED, validator, values, label = '', hint = '', ...other} = {}) {
    extendObservable(this, {
      _value: value,
      _error: error,
      _defaultValue: defaultValue,
      _values: [],
      _formatter: yes,
      _validator: yes,
      _label: typeFilter(label, stringHandler),
      _hint: typeFilter(hint, stringHandler)
    })
    this.formatter = formatter
    this.validator = validator
    this.values = values
    for (const key in other) {
      this[key] = other[key]
    }
  }
}

class Collection {
  /**
   * @typedef {{key,value}} Item
   * @typedef {Array<Item>} Items
   * */

  // elements

  /**
   * @param {*} key
   * @param {*} value
   * @return {Item}
   * */
  static createItem (key, value) {
    return observable({ key, value }, {}, { deep: false })
  }

  // conversion

  /**
   * @param {Array} arr
   * @return {Items}
   * */
  static arrayToItems (arr) {
    const result = []
    let count = 0
    for (const value of arr) {
      result.push(Collection.createItem(count++, value))
    }
    return result
  }

  /**
   * @param {Set} set
   * @return {Items}
   * */
  static setToItems (set) {
    const result = []
    let count = 0
    for (const value of set) {
      result.push(Collection.createItem(count++, value))
    }
    return result
  }

  /**
   * @param {Map} map
   * @return {Items}
   * */
  static mapToItems (map) {
    const result = []
    for (const [key, value] of map) {
      result.push(Collection.createItem(key, value))
    }
    return result
  }

  /**
   * @param {Set|Map} setMap
   * @return {Array}
   * */
  static setMapToValues (setMap) {
    const result = []
    for (const value of setMap.values()) {
      result.push(value)
    }
    return result
  }

  /**
   * @param {Set|Map} setMap
   * @return {Array}
   * */
  static setMapToKeys (setMap) {
    const result = []
    for (const key of setMap.keys()) {
      result.push(key)
    }
    return result
  }

  // filtration

  static itemsFilter (items) {
    return () => typeFilter(items, {
      function: callRecheck,
      array: yes,
      Set: Collection.setToItems,
      Map: Collection.mapToItems,
      other: () => []
    })
  }
  static valuesFilter (values) {
    return () => typeFilter(values, {
      function: callRecheck,
      array: yes,
      Set: Collection.setMapToValues,
      Map: Collection.setMapToValues,
      other: () => []
    })
  }
  static keysFilter (keys) {
    return () => typeFilter(keys, {
      function: callRecheck,
      array: yes,
      Set: Collection.setMapToKeys,
      Map: Collection.setMapToKeys,
      other: () => []
    })
  }

  @computed
  get keys () {
    return this._keys
  }
  set keys (keys) {
    this.__keys = Collection.keysFilter(keys)
  }

  @computed
  get values () {
    return this._values
  }
  set values (values) {
    this.__values = Collection.valuesFilter(values)
  }

  @computed
  get length () {
    return this.items.length
  }

  @computed
  get items () {
    return this._items
  }
  set items (items) {
    this.__items = Collection.itemsFilter(items)
  }

  constructor ({keys, values, items} = {}) {
    const _this = this
    extendObservable(this, {
      get _keys () {
        return observable.array(_this.__keys(), { deep: false })
      },
      get _values () {
        return observable.array(_this.__values(), { deep: false })
      },
      get _items () {
        return observable.array(_this.__items(), { deep: false })
      },
      __keys: Collection.itemsFilter(keys),
      __values: Collection.itemsFilter(values),
      __items: Collection.itemsFilter(items)
    }, {
      _items: computed,
      _values: computed,
      _keys: computed
    })
    // this[Symbol.iterator] = this.entries
  }
}

class Table {
  /** @type {Array<Field>|Function} */
  @computed
  get fields () {
    return typeFilter(this._fields, {
      array: yes,
      function: value => value()
    })
  }
  set fields (value) {
    const set = value => this._fields = value
    typeFilter(value, {
      function: set,
      class: value => value.constructor.name === 'Map' && set(value)
    })
  }

  constructor ({fields} = {}) {
    extendObservable(this, {
      _fields: typeFilter(fields, {function: yes, class: fields => fields.constructor.name === 'Map' ? fields : new Map()}, new Map())
    })
  }
}




class List {
  *[Symbol.iterator] () {
    yield 1;
    yield 2;
    yield 3;
  }
  map (filter, {from = 0, to = Infinity} = {}) {
    const values = computed(() => {
      let index = -1
      const result = []
      for (const value of this) {
        index++
        if (index < from) continue
        if (index > to) break
        result.push(filter(value))
      }
      return result
    })
    return () => values.get()
  }
}








describe('Field', () => {
  it('value', () => {
    const field = new Field()
    expect(field.value).toBe(undefined)
    field.value = 1
    expect(field.value).toBe(1)
  })
  it('value is function', () => {
    const field = new Field()
    field.value = () => 1
    expect(field.value).toBe(1)
    // other tests
    let i = 0
    field.value = () => {
      i++
      return 'value'
    }
    autorun(() => field.value)
    expect(i).toBe(1)
    expect(field.value).toBe('value')
    expect(i).toBe(1)
    field.value = () => i++
    expect(i).toBe(2)
    expect(field.value).toBe(1)
    expect(field.value).toBe(1)
  })
  it('defaultValue', () => {
    const field = new Field({
      defaultValue: 1
    })
    expect(field.value).toBe(1)
    field.value = 2
    expect(field.value).toBe(2)
  })
  it('defaultValue is function', () => {
    const field = new Field({
      defaultValue: () => 1
    })
    expect(field.value).toBe(1)
    field.value = 2
    expect(field.value).toBe(2)
    // other tests
    let i = 0
    field.defaultValue = () => {
      i++
      return 'value'
    }
    autorun(() => field.value)
    expect(i).toBe(0)
    field.reset()
    expect(i).toBe(1)
    expect(field.value).toBe('value')
    expect(i).toBe(1)
  })
  it('label', () => {
    const field = new Field({
      label: 'Field label'
    })
    expect(field.label).toBe('Field label')
    field.label = 'value'
    expect(field.label).toBe('value')
    field.label = 1
    expect(field.label).toBe('1')
    field.label = true
    expect(field.label).toBe('true')
    field.label = false
    expect(field.label).toBe('false')
    field.label = () => 'value'
    expect(field.label).toBe('value')
    field.label = null
    expect(field.label).toBe('')
    field.label = undefined
    expect(field.label).toBe('')
    field.label = {}
    expect(field.label).toBe('')
    field.label = []
    expect(field.label).toBe('')
    field.label = new class {}
    expect(field.label).toBe('')
    // other tests
    let i = 0
    field.label = () => {
      i++
      return 'value'
    }
    autorun(() => field.label)
    expect(i).toBe(1)
    expect(field.label).toBe('value')
    expect(i).toBe(1)
  })
  it('hint', () => {
    const field = new Field({
      hint: 'Field hint'
    })
    expect(field.hint).toBe('Field hint')
    field.hint = 'value'
    expect(field.hint).toBe('value')
    field.hint = 1
    expect(field.hint).toBe('1')
    field.hint = true
    expect(field.hint).toBe('true')
    field.hint = false
    expect(field.hint).toBe('false')
    field.hint = () => 'value'
    expect(field.hint).toBe('value')
    field.hint = null
    expect(field.hint).toBe('')
    field.hint = undefined
    expect(field.hint).toBe('')
    field.hint = {}
    expect(field.hint).toBe('')
    field.hint = []
    expect(field.hint).toBe('')
    field.hint = new class {}
    expect(field.hint).toBe('')
    // other tests
    let i = 0
    field.hint = () => {
      i++
      return 'value'
    }
    autorun(() => field.hint)
    expect(i).toBe(1)
    expect(field.hint).toBe('value')
    expect(i).toBe(1)
  })
  it('isChanged', () => {
    const field = new Field()
    expect(field.isChanged).toBe(false)
    field.value = 1
    expect(field.isChanged).toBe(true)
    field.reset()
    expect(field.isChanged).toBe(false)
  })
  it('reset', () => {
    const field = new Field()
    field.value = 1
    expect(field.value).toBe(1)
    field.reset()
    expect(field.value).toBe(undefined)
  })
  it('reset with defaultValue', () => {
    const field = new Field({defaultValue: 1})
    expect(field.value).toBe(1)
    field.value = 2
    expect(field.value).toBe(2)
    field.reset()
    expect(field.value).toBe(1)
  })
  it('autorun', () => {
    const call = jest.fn()
    const field = new Field()
    expect(call.mock.calls.length).toBe(0)
    autorun(() => call(field.value))
    expect(call.mock.calls.length).toBe(1)
    field.value = 1
    field.value = 1
    expect(call.mock.calls.length).toBe(2)
    field.reset()
    field.reset()
    expect(call.mock.calls.length).toBe(3)
  })
  it('formatter', () => {
    const field = new Field({
      defaultValue: 1,
      formatter: value => parseInt(value)
    })
    expect(field.value).toBe(1)
    field.value = '2'
    expect(field.value).toBe(2)
  })
  it('formatter is array', () => {
    const field = new Field({
      defaultValue: 1,
      formatter: [
        value => parseInt(value),
        [value => value + 1]
      ]
    })
    expect(field.value).toBe(2)
    field.value = '2'
    expect(field.value).toBe(3)
  })
  it('formatter is object', () => {
    const field = new Field({
      defaultValue: 1,
      formatter: {
        number: value => value + 1,
        string: [
          value => parseInt(value),
          recheck
        ],
        other: () => 3
      }
    })
    expect(field.value).toBe(2)
    field.value = '2'
    expect(field.value).toBe(3)
  })
  it('values', () => {
    const field = new Field({
      defaultValue: 0,
      values: [
        1, 10, 100
      ]
    })
    expect(field.error).toBe(true)
    field.value = 1
    expect(field.error).toBe(false)
    field.value = 18
    expect(field.error).toBe(true)
    field.value = 100
    expect(field.error).toBe(false)
  })
  it('values is function', () => {
    const field = new Field({
      values: () => [
        true, false, () => undefined
      ]
    })
    expect(field.error).toBe(false)
    field.value = 1
    expect(field.error).toBe(true)
    field.value = true
    expect(field.error).toBe(false)
    field.value = false
    expect(field.error).toBe(false)
  })
  it('validator', () => {
    const field = new Field({
      defaultValue: 1,
      validator: value => value > 2
    })
    expect(field.error).toBe(false)
    field.value = 3
    expect(field.error).toBe(true)
  })
  it('validator is array', () => {
    const field = new Field({
      defaultValue: 3,
      validator: [
        value => value < 3 && 'min value is 3',
        value => value > 4 && 'max value is 4'
      ]
    })
    expect(field.error).toBe(undefined)
    field.value = 2
    expect(field.error).toBe('min value is 3')
    field.value = 5
    expect(field.error).toBe('max value is 4')
  })
  it('validator is object', () => {
    const field = new Field({
      validator: {
        string: value => value.length > 4 && 'max value is 9999',
        number: value => value > 9999 && 'max value is 9999',
        undefined: () => '',
        other: () => 'wrong type'
      }
    })
    expect(field.error).toBe('')
    field.value = '12345'
    expect(field.error).toBe('max value is 9999')
    field.value = 12345
    expect(field.error).toBe('max value is 9999')
    field.value = {}
    expect(field.error).toBe('wrong type')
  })
  it('error', () => {
    const field = new Field({
      error: 'error'
    })
    expect(field.error).toBe('error')
    field.error = ''
    expect(field.error).toBe('')
  })
  it('clearError', () => {
    const field = new Field({
      error: 'error',
      validator: value => value === undefined
    })
    expect(field.error).toBe('error')
    field.clearError()
    expect(field.error).toBe(true)
  })
  it('custom options', () => {
    const root = {}
    const field = new Field({root, some: true})
    expect(field.root).toBe(root)
    expect(field.some).toBe(true)
  })
})

describe('List', () => {
  it('map', () => {
    const list = new List()
    const spy = []
    const map = list.map(value => value + 1)
    autorun(() => spy.push(map()))
    expect(map()).toEqual([2, 3, 4])
    expect(spy.length).toEqual(1)
    expect(map()).toEqual([2, 3, 4])
    expect(spy.length).toEqual(1)
  })
})

describe('Collection', () => {
  it('set get', () => {
    const keysCall = []
    const valuesCall = []
    const itemsCall = []

    const collection = new Collection({
      keys: [0, 1, 2],
      values: ['zero', 'one', 'two']
    })

    expect(isObservableArray(collection.keys)).toBe(true)
    expect(isObservableArray(collection.values)).toBe(true)
    expect(isObservableArray(collection.items)).toBe(true)

    autorun(() => keysCall.push(collection.keys))
    const keys = collection.keys
    expect(keys === collection.keys).toEqual(true)
    expect(keysCall.length).toEqual(1)
    collection.keys = [0, 1, 2]
    expect(keysCall.length).toEqual(1)

    expect(collection.keys).toEqual([0, 1, 2])
    expect(collection.values).toEqual(['zero', 'one', 'two'])
    expect(collection.items).toEqual([{key: 0, value: 'zero'}, {key: 1, value: 'one'}, {key: 2, value: 'two'}])

    autorun(() => keysCall.push(collection.keys[0]))
    autorun(() => valuesCall.push(collection.values))
    autorun(() => itemsCall.push(collection.items[0]))

    expect(keysCall.length).toBe(1)
    expect(valuesCall.length).toBe(1)
    expect(itemsCall.length).toBe(1)

    expect(keysCall[0]).toBe(0)
    // expect(valuesCall[0]).toBe('zero')
    expect(itemsCall[0]).toEqual({key: 0, value: 'zero'})

    collection.values[1] = 'One'

    expect(keysCall.length).toBe(1)
    expect(valuesCall.length).toBe(2)
    expect(itemsCall.length).toBe(2)
  })
})

describe('Table', () => {
  it('fields', () => {
    const table = new Table()
    expect(typeFilter(table.fields)).toBe('class')
    expect(table.fields.size).toBe(0)
    table.fields.add('', new Field({defaultValue: 1}))
    expect(table.fields.size).toBe(1)
    expect(table.fields.get('').value).toBe(1)
  })
})