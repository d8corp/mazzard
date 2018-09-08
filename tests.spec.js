// SetList
const SET_LIST_HANDLER = {
  get (target, property, receiver) {
    if (!target[property]) {
      target[property] = new Set()
    }
    return Reflect.get(target, property, receiver)
  }
}
function createSetList () {
  return new Proxy(Object.create(null), SET_LIST_HANDLER)
}

const MAZZARD_ID = Symbol('mazzard')
/** Текущий action
 * @type {Function}
 * */
let activeReaction
/** Глубина текущего action по отношению к root action
 * @type {Number}
 * */
let countActiveReactions = 0
/**
 * 1. Map -> ключи - экземпляры mazzard
 * 2. Set ->
 * @type {Map<Set<Set<Function>>>}
 * */
const reactionsList = new Map()
function isSimpleObject (value) {

  return typeof value === 'object' && value !== null && (!!value.__proto__ && !value.__proto__.__proto__ || !value.__proto__)
}
const functionPrototype = Function.prototype
function isFunctionProperty (key) {
  return key in functionPrototype
}
const arrayPrototype = Array.prototype
function isArrayProperty (key) {
  if (key === 'length') return false
  if (key === '$$type') return true
  return key in arrayPrototype
}
const objectPrototype = Object.prototype
function isObjectProperty (key) {
  /** Реакции которые будут запущены в одно время после окончания работы верхнего action
   * @type {Set<Function>}
   * */
  const activeReactions = new Set()
  return key in objectPrototype
}
function isMazzard (value) {
  return value[MAZZARD_ID]
}

function callActionReactions () {
  if (!countActiveReactions) {
    activeReactions.forEach(reaction => {
      reaction()
    })
    activeReactions.clear()
  }
}

function observer (func) {
  func = new Proxy(func, {
    apply (target, thisValue, args) {
      const prevReaction = activeReaction
      activeReaction = func
      countActiveReactions++
      reactionsList.get(func).clear()
      Reflect.apply(target, thisValue, args)
      countActiveReactions--
      activeReaction = prevReaction
    }
  })
  reactionsList.set(func, new Set())
  return func
}

function mObject (value) {
  const propertyReactions = createSetList()
  const cache = Object.create(null)
  // const actionValues = Object.create(null)

  return new Proxy(value, {
    get (target, property, receiver) {
      if (property === MAZZARD_ID) {
        return true
      }
      if (isObjectProperty(property)) {
        return Reflect.get(target, property, receiver)
      }
      if (activeReaction) {
        propertyReactions[property].forEach(reaction => {
          reactionsList.get(activeReaction).add(reaction)
        })
        propertyReactions[property].add(activeReaction)
      }
      if (cache[property]) {
        return cache[property]
      }
      const prevReaction = activeReaction
      activeReaction = () => {
        delete cache[property]
        propertyReactions[property].forEach(reaction => {
          activeReactions.add(reaction)
        })
        propertyReactions[property].clear()
      }
      reactionsList.set(activeReaction, new Set())
      let result = Reflect.get(target, property, receiver)
      result = mazzard(result)
      if (!reactionsList.get(activeReaction).size) {
        reactionsList.delete(activeReaction)
      }
      cache[property] = result
      activeReaction = prevReaction
      return result
    },
    set (target, property, value, receiver) {
      if (cache[property] === value) {
        return true
      }
      delete cache[property]
      countActiveReactions++
      Reflect.set(target, property, value, receiver)
      countActiveReactions--
      propertyReactions[property].forEach(reaction => {
        activeReactions.add(reaction)
      })
      propertyReactions[property].clear()
      callActionReactions()
      return true
    }
  })
}

function mazzard (value) {
  const isArray = Array.isArray(value)
  const isAction = typeof value === 'function'
  const isObject = isSimpleObject(value)
  if (!isAction && !isArray && !isObject) return value
  const propertyReactions = createSetList()
  const cache = Object.create(null)
  // const actionValues = Object.create(null)

  return new Proxy(value, {
    apply (target, thisValue, args) {
      countActiveReactions++
      Reflect.apply(target, thisValue, args)
      countActiveReactions--
      callActionReactions()
    },
    get (target, property, receiver) {
      if (property === MAZZARD_ID) {
        return true
      }
      if ((isAction && isFunctionProperty(property)) || (isArray && isArrayProperty(property)) || (isObject && isObjectProperty(property))) {
        return Reflect.get(target, property, receiver)
      }
      if (isArray) {
        if (property === '__proto__') {
          return Reflect.get(target, property, receiver)
        }
      }
      if (activeReaction) {
        propertyReactions[property].forEach(reaction => {
          reactionsList.get(activeReaction).add(reaction)
        })
        propertyReactions[property].add(activeReaction)
      }
      if (cache[property]) {
        return cache[property]
      }
      const prevReaction = activeReaction
      activeReaction = () => {
        delete cache[property]
        propertyReactions[property].forEach(reaction => {
          activeReactions.add(reaction)
        })
        propertyReactions[property].clear()
      }
      reactionsList.set(activeReaction, new Set())
      let result = Reflect.get(target, property, receiver)
      result = mazzard(result)
      if (!reactionsList.get(activeReaction).size) {
        reactionsList.delete(activeReaction)
      }
      cache[property] = result
      activeReaction = prevReaction
      return result
    },
    set (target, property, value, receiver) {
      if (cache[property] === value) {
        return true
      }
      delete cache[property]
      countActiveReactions++
      Reflect.set(target, property, value, receiver)
      countActiveReactions--
      propertyReactions[property].forEach(reaction => {
        activeReactions.add(reaction)
      })
      propertyReactions[property].clear()
      callActionReactions()
      return true
    }
  })
}

/* global describe, it, expect, jest */

describe('mazzard', () => {
  it('simple object', () => {
    expect(isSimpleObject({})).toBe(true)
    expect(isSimpleObject(Object.create(null))).toBe(true)
    expect(isSimpleObject(1)).toBe(false)
    expect(isSimpleObject(() => {})).toBe(false)
    expect(isSimpleObject('asd')).toBe(false)
    expect(isSimpleObject([])).toBe(false)
    expect(isSimpleObject(undefined)).toBe(false)
    expect(isSimpleObject(null)).toBe(false)
    expect(isSimpleObject(NaN)).toBe(false)
    expect(isSimpleObject(new Promise(resolve => resolve()))).toBe(false)
    expect(isSimpleObject(Object.create({}))).toBe(false)
  })
  it('returns correct result', () => {
    expect(mazzard(1)).toBe(1)
    expect(mazzard(0)).toBe(0)
    expect(mazzard(undefined)).toBe(undefined)
    expect(mazzard(null)).toBe(null)
    expect(mazzard(NaN)).toBe(NaN)
    expect(mazzard('string')).toBe('string')
    expect(mazzard('')).toBe('')
    expect(MAZZARD_ID in mazzard([])).toBe(false)
    expect(mazzard({}).hasOwnProperty(MAZZARD_ID)).toBe(false)
    expect(Object.keys(mazzard({}))).toEqual([])
    expect(Object.getOwnPropertyDescriptors(mazzard({}))).toEqual({})
    const store = mazzard({})
    for (const name in store) {
      expect(name).toBe(false)
    }
    expect(isMazzard(mazzard(() => {}))).toBe(true)
  })
  it('instance of', () => {
    expect(mazzard({}) instanceof Object).toBe(true)
    expect(mazzard([]) instanceof Array).toBe(true)
    expect(mazzard(() => {}) instanceof Function).toBe(true)
  })
  it('has property', () => {
    const store = mazzard({
      a: 1
    })
    expect(store.hasOwnProperty('a')).toBe(true)
    expect(store.a).toBe(1)
    expect('a' in store).toBe(true)
    expect(store).toEqual({a: 1})
  })
  it('action test', () => {
    const store = mazzard({
      a: 1,
      test () {
        this.a = 2
      }
    })
    expect(store.a).toBe(1)
    store.test()
    expect(store.a).toBe(2)
  })
  it('simple observer test', () => {
    const call = jest.fn()
    const store = mazzard({
      a: 1
    })
    observer(() => {
      call(store.a)
    })()
    expect(call.mock.calls.length).toBe(1)
    expect(call.mock.calls[0][0]).toBe(1)
    expect(store.a).toBe(1)
    store.a = 2
    store.a = 2
    expect(store.a).toBe(2)
    expect(call.mock.calls.length).toBe(2)
    expect(call.mock.calls[1][0]).toBe(2)
  })
  it('observer test with action', () => {
    const call = jest.fn()
    const store = mazzard({
      a: 1,
      test () {
        this.a = 3
        this.a = 2
      }
    })
    observer(() => {
      call(store.a)
    })()
    expect(call.mock.calls.length).toBe(1)
    expect(call.mock.calls[0][0]).toBe(1)
    expect(store.a).toBe(1)
    store.test()
    expect(store.a).toBe(2)
    expect(call.mock.calls.length).toBe(2)
    expect(call.mock.calls[1][0]).toBe(2)
  })
  it('computed', () => {
    const store = mazzard({
      a: 1,
      b: 2,
      get sum () {
        return this.a + this.b
      }
    })
    expect(store.a).toBe(1)
    expect(store.b).toBe(2)
    expect(store.sum).toBe(3)
    store.b = 3
    expect(store.a).toBe(1)
    expect(store.b).toBe(3)
    expect(store.sum).toBe(4)
  })
  it('computed observer', () => {
    const call = jest.fn()
    const store = mazzard({
      a: 1,
      b: 2,
      get sum () {
        return this.a + this.b
      }
    })
    observer(() => {
      call(store.sum)
    })()
    expect(call.mock.calls.length).toBe(1)
    expect(call.mock.calls[0][0]).toBe(3)
    store.b = 3
    expect(call.mock.calls.length).toBe(2)
    expect(call.mock.calls[1][0]).toBe(4)
  })
  it('cached computed property', () => {
    const call = jest.fn()
    const store = mazzard({
      a: 1,
      b: 2,
      get sum () {
        call()
        return this.a + this.b
      }
    })
    expect(call.mock.calls.length).toBe(0)
    expect(store.sum).toBe(3)
    expect(call.mock.calls.length).toBe(1)
    expect(store.sum).toBe(3)
    expect(call.mock.calls.length).toBe(1)
  })
  it('action with computed', () => {
    const getterCall = jest.fn()
    const call = jest.fn()
    const store = mazzard({
      a: 1,
      b: 2,
      test () {
        this.a = 2
        this.b = 3
      },
      get sum () {
        getterCall()
        return this.a + this.b
      }
    })
    expect(getterCall.mock.calls.length).toBe(0)
    observer(() => {
      call(store.sum)
    })()
    expect(call.mock.calls.length).toBe(1)
    expect(getterCall.mock.calls.length).toBe(1)
    store.test()
    expect(call.mock.calls.length).toBe(2)
    expect(getterCall.mock.calls.length).toBe(2)
  })
  it('can use object like a property', () => {
    const getterCall = jest.fn()
    const call = jest.fn()
    const store = mazzard({
      a: {
        x: 1,
        y: 2,
        test () {
          this.x = 2
          this.y = 2
          this.x = 3
          this.y = 1
        },
        get sum () {
          getterCall()
          return this.x + this.y
        }
      }
    })
    expect(getterCall.mock.calls.length).toBe(0)
    observer(() => {
      call(store.a.sum)
    })()
    expect(getterCall.mock.calls.length).toBe(1)
    expect(call.mock.calls.length).toBe(1)
    expect(store.a.x).toBe(1)
    expect(store.a.y).toBe(2)
    expect(store.a.sum).toBe(3)
    store.a.test()
    expect(getterCall.mock.calls.length).toBe(2)
    expect(call.mock.calls.length).toBe(2)
    expect(store.a.x).toBe(3)
    expect(store.a.y).toBe(1)
    expect(store.a.sum).toBe(4)
    expect(getterCall.mock.calls.length).toBe(2)
    // TODO: добавить кэш изночальных значений в action
    store.a.test()
    expect(getterCall.mock.calls.length).toBe(2)
    expect(call.mock.calls.length).toBe(2)
    expect(store.a.x).toBe(3)
    expect(store.a.y).toBe(1)
    expect(store.a.sum).toBe(4)
    expect(getterCall.mock.calls.length).toBe(2)
  })
  it('observer for nonexistent property', () => {
    const call = jest.fn()
    const store = mazzard({})
    observer(() => {
      call(store.x)
    })()
    expect(store.x).toBe(undefined)
    expect('x' in store).toBe(false)
    expect(store.hasOwnProperty('x')).toBe(false)
    expect(call.mock.calls.length).toBe(1)
    expect(call.mock.calls[0][0]).toBe(undefined)
    store.x = 1
    expect(store.x).toBe(1)
    expect(call.mock.calls.length).toBe(2)
    expect(call.mock.calls[1][0]).toBe(1)
  })
  it('function is action', () => {
    const call = jest.fn()
    const store = mazzard(() => {
      store.x = 2
      store.x = 3
    })
    observer(() => {
      call(store.x)
    })()
    store.x = 1
    expect(store.x).toBe(1)
    expect(call.mock.calls.length).toBe(2)
    expect(call.mock.calls[0][0]).toBe(undefined)
    expect(call.mock.calls[1][0]).toBe(1)
    store()
    expect(store.x).toBe(3)
    expect(call.mock.calls.length).toBe(3)
    expect(call.mock.calls[2][0]).toBe(3)
  })
  it('can be array', () => {
    const store = mazzard([0, 1, 2, 3])
    expect(store.length).toBe(4)
    expect(store[0]).toBe(0)
    expect(store[1]).toBe(1)
    expect(store[2]).toBe(2)
    expect(store[3]).toBe(3)
    expect(store).toEqual([0, 1, 2, 3])
  })
  it('array reduce', () => {
    const store = mazzard([0, 1, 2, 3])
    expect(store.reduce((result, value) => result + value, 0)).toBe(6)
  })
  it('array map', () => {
    const store = mazzard([0, 1, 2, 3])
    expect(store.map(value => value + 1)).toEqual([1, 2, 3, 4])
  })
  it('array filter', () => {
    const store = mazzard([0, 1, 2, 3])
    expect(store.filter(value => !!value)).toEqual([1, 2, 3])
  })
  it('array push', () => {
    const store = mazzard([0, 1, 2, 3])
    store.push(4)
    expect(store.length).toBe(5)
    expect(store).toEqual([0, 1, 2, 3, 4])
  })
  it('array indexOf', () => {
    const store = mazzard([0, 1, 2, 3])
    expect(store.indexOf(2)).toBe(2)
    expect(store.indexOf(4)).toBe(-1)
  })
  it('array keys', () => {
    const call = jest.fn()
    const store = mazzard([0, 1, 2, 3])
    for (const value of store.keys()) {
      call(value)
    }
    expect(call.mock.calls.length).toBe(4)
    expect(call.mock.calls[0][0]).toBe(0)
    expect(call.mock.calls[1][0]).toBe(1)
    expect(call.mock.calls[2][0]).toBe(2)
    expect(call.mock.calls[3][0]).toBe(3)
  })
  it('array for of', () => {
    const call = jest.fn()
    const store = mazzard([0, 1, 2, 3])
    for (const value of store) {
      call(value)
    }
    expect(call.mock.calls.length).toBe(4)
    expect(call.mock.calls[0][0]).toBe(0)
    expect(call.mock.calls[1][0]).toBe(1)
    expect(call.mock.calls[2][0]).toBe(2)
    expect(call.mock.calls[3][0]).toBe(3)
  })
})