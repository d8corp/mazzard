/* global it, describe, expect */
const mazzard = require('./index.js').default
const action = require('./index.js').action
const MAZZARD = require('./index.js').MAZZARD
const array = require('./array.js').default

describe('mazzard', () => {
  describe('primitives', () => {
    it('empty', () => {
      expect(mazzard()).toBe(undefined)
      expect(mazzard(undefined)).toBe(undefined)
    })
    it('number', () => {
      expect(mazzard(0)).toBe(0)
      expect(mazzard(1)).toBe(1)
      expect(mazzard(1.2)).toBe(1.2)
      expect(mazzard(Infinity)).toBe(Infinity)
    })
    it('string', () => {
      expect(mazzard('')).toBe('')
      expect(mazzard('1')).toBe('1')
      expect(mazzard('test')).toBe('test')
    })
    it('null', () => {
      expect(mazzard(null)).toBe(null)
    })
    it('bool', () => {
      expect(mazzard(false)).toBe(false)
      expect(mazzard(true)).toBe(true)
    })
    it('NaN', () => {
      expect(mazzard(NaN)).toBe(NaN)
    })
    it('Symbol', () => {
      const symbol = Symbol('test')
      expect(mazzard(symbol)).toBe(symbol)
    })
  })
  describe('observable', () => {
    it('not equals', () => {
      const test = {}
      expect(test !== mazzard(test)).toBe(true)
    })
    it('is mazzard', () => {
      const test = mazzard({})
      expect(test[MAZZARD]).toBe(true)
      expect(MAZZARD in test).toBe(true)
    })
  })
  describe('observer', () => {
    it('with observable', () => {
      const log = []
      const test = mazzard({})
      mazzard(() => log.push(test.testField))

      expect(log.length).toBe(1)
      expect(log[0]).toBe(undefined)

      test.someField = true
      expect(log.length).toBe(1)

      test.testField = true
      expect(log.length).toBe(2)
      expect(log[1]).toBe(true)

      test.testField = 'test'
      expect(log.length).toBe(3)
      expect(log[2]).toBe('test')

      test.testField = undefined
      expect(log.length).toBe(4)
      expect(log[3]).toBe(undefined)
    })
    it('stop', () => {
      const log = []
      const test = mazzard({count: 0})
      let stopped = false

      mazzard(stop => {
        if (test.count > 1) {
          stopped = true
          stop()
        } else {
          log.push(test.count)
        }
      })

      expect(log.length).toBe(1)
      expect(log[0]).toBe(0)
      expect(stopped).toBe(false)

      test.count++
      expect(log.length).toBe(2)
      expect(log[1]).toBe(1)
      expect(stopped).toBe(false)

      test.count++
      expect(log.length).toBe(2)
      expect(stopped).toBe(true)
    })
    it('stop outside', () => {
      const log = []
      const test = mazzard({})

      const stop = mazzard(() => log.push(test.testField))

      expect(log.length).toBe(1)
      expect(log[0]).toBe(undefined)

      test.testField = true
      expect(log.length).toBe(2)
      expect(log[1]).toBe(true)

      test.testField = 1
      expect(log.length).toBe(3)
      expect(log[2]).toBe(1)

      stop()
      test.testField = 2
      expect(log.length).toBe(3)
    })
    it('set the same value', () => {
      const observer = []
      const test = mazzard({})

      mazzard(() => observer.push(test.testField))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.testField = true
      expect(observer.length).toBe(2)

      test.testField = false
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(false)
    })
    it('delete', () => {
      const observer = []
      const test = mazzard({})

      mazzard(() => observer.push(test.testField))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      delete test.testField
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(undefined)

      delete test.testField
      expect(observer.length).toBe(3)

      test.testField = false
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe(false)
    })
    it('in', () => {
      const observer = []
      const test = mazzard({})

      mazzard(() => observer.push('testField' in test))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(false)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.testField = false
      expect(observer.length).toBe(2)

      delete test.testField
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(false)

      delete test.testField
      expect(observer.length).toBe(3)
    })
    it('for in', () => {
      const test = mazzard({})
      let count = 0
      let log = []

      mazzard(() => {
        count++
        log = []
        for (const key in test) {
          log.push(key)
        }
      })

      expect(count).toBe(1)
      expect(log).toEqual([])

      test.test1 = true
      expect(count).toBe(2)
      expect(log).toEqual(['test1'])

      test.test1 = false
      expect(count).toBe(2)
      expect(log).toEqual(['test1'])

      test.test2 = undefined
      expect(count).toBe(3)
      expect(log).toEqual(['test1', 'test2'])

      delete test.test2
      expect(count).toBe(4)
      expect(log).toEqual(['test1'])
    })
  })
  describe('action', () => {
    it('simple', () => {
      const observer = []
      const test = mazzard({
        update (field1, field2) {
          this.field1 = field1
          this.field2 = field2
        }
      })

      mazzard(() => observer.push({field1: test.field1, field2: test.field2}))

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual({field1: undefined, field2: undefined})

      test.update(1, 2)
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual({field1: 1, field2: 2})
    })
    it('action', () => {
      const observer = []
      const test = mazzard({})
      const update = action((field1, field2) => {
        test.field1 = field1
        test.field2 = field2
      })

      mazzard(() => observer.push({field1: test.field1, field2: test.field2}))

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual({field1: undefined, field2: undefined})

      update(1, 2)
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual({field1: 1, field2: 2})
    })
    it('setter', () => {
      const observer = []
      const test = mazzard({
        get fullName () {
          return this.name && this.secondName ? `${this.name} ${this.secondName}` : null
        },
        set fullName (value) {
          const [name, secondName] = value.split(' ')
          this.name = name
          this.secondName = secondName
        }
      })

      mazzard(() => observer.push(test.fullName))

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual(null)

      test.fullName = 'Mike Deight'
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual('Mike Deight')
    })
    it('setter with getter', () => {
      const name = []
      const fullName = []
      const secondName = []
      const test = mazzard({
        get fullName () {
          return this.name && this.secondName ? `${this.name} ${this.secondName}` : null
        },
        set fullName (value) {
          const [name, secondName] = value.split(' ')
          this.name = name
          this.secondName = secondName
        }
      })

      mazzard(() => fullName.push(test.fullName))
      mazzard(() => name.push(test.name))
      mazzard(() => secondName.push(test.secondName))

      expect(fullName.length).toBe(1)
      expect(fullName[0]).toEqual(null)
      expect(name.length).toBe(1)
      expect(name[0]).toEqual(undefined)
      expect(secondName.length).toBe(1)
      expect(secondName[0]).toEqual(undefined)

      test.fullName = 'Mike'
      expect(fullName.length).toBe(1)
      expect(name.length).toBe(2)
      expect(name[1]).toEqual('Mike')
      expect(secondName.length).toBe(1)

      test.fullName = 'Mike Deight'
      expect(fullName.length).toBe(2)
      expect(fullName[1]).toEqual('Mike Deight')
      expect(name.length).toBe(2)
      expect(secondName.length).toBe(2)
      expect(secondName[1]).toEqual('Deight')
    })
  })
  describe('computed', () => {
    it('simple', () => {
      const observer = []
      const test = mazzard({
        get fullName () {
          return this.name && this.secondName ? `${this.name} ${this.secondName}` : ''
        }
      })

      mazzard(() => observer.push(test.fullName))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe('')

      test.name = 'Mike'
      expect(observer.length).toBe(1)

      test.secondName = 'Tester'
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual('Mike Tester')

      test.secondName = 'Mighty'
      expect(observer.length).toBe(3)
      expect(observer[2]).toEqual('Mike Mighty')
    })
    it('getter inside getter', () => {
      const shortName = []
      const fullName = []
      const test = mazzard({
        get fullName () {
          return this.name && this.secondName ? `${this.name} ${this.secondName}` : undefined
        },
        get shortName () {
          return this.fullName && this.fullName.match(/^([^ ]+ [A-Za-z])/)[1] + '.'
        }
      })

      mazzard(() => fullName.push(test.fullName))
      mazzard(() => shortName.push(test.shortName))

      expect(fullName.length).toBe(1)
      expect(fullName[0]).toEqual(undefined)
      expect(shortName.length).toBe(1)
      expect(shortName[0]).toEqual(undefined)

      test.name = 'Mike'
      expect(fullName.length).toBe(1)
      expect(shortName.length).toBe(1)

      test.secondName = 'Mighty'
      expect(fullName.length).toBe(2)
      expect(fullName[1]).toEqual('Mike Mighty')
      expect(shortName.length).toBe(2)
      expect(shortName[1]).toEqual('Mike M.')

      test.secondName = 'Mr'
      expect(fullName.length).toBe(3)
      expect(fullName[2]).toEqual('Mike Mr')
      expect(shortName.length).toBe(2)
    })
  })
  describe('array', () => {
    it('not equals', () => {
      const test = []
      expect(test !== mazzard(test)).toBe(true)
    })
    it('observable', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test[0]))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.push(1)

      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(1)

      test.push(2)
      expect(observer.length).toBe(2)

      test[0] = 2
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(2)

      test[1] = 3
      expect(observer.length).toBe(3)
    })
    it('length', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.length))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(0)

      test.push(1)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(1)

      test.push(2)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(2)

      test[0] = 2
      expect(observer.length).toBe(3)

      test.length = 0
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe(0)
      expect(test[0]).toBe(2)
      expect(observer.length).toBe(4)

      test[0] = 1
      expect(observer.length).toBe(4)
    })
    it('field', () => {
      const observer = []
      const test = mazzard({array: []})

      mazzard(() => observer.push(test.array.join(', ')))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe('')

      test.array.push(1)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe('1')

      test.array.push(2)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe('1, 2')

      action(() => {
        test.array[0] = 0
        test.array[1] = 1
      })()
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe('0, 1')

      test.array[2] = 'test'
      expect(observer.length).toBe(4)
    })
    it('copyWithin', () => {
      const observer = []
      const test = mazzard([1, 2, 3])

      mazzard(() => observer.push(test.join(', ')))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe('1, 2, 3')

      test.copyWithin(0, 1)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe('2, 3, 3')
    })
    it('entries', () => {
      const observer = []
      const test = mazzard([1, 2, 3])

      mazzard(() => {
        const testEnt = test.entries()
        observer.push([testEnt.next().value, testEnt.next().value, testEnt.next().value])
      })

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual([[0, 1], [1, 2], [2, 3]])

      test[0] = 0
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual([[0, 0], [1, 2], [2, 3]])

      test[3] = 4
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual([[0, 0], [1, 2], [2, 3]])

      test[3] = 5
      expect(observer.length).toBe(2)
    })
    it('join', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.join(', ')))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe('')

      test.push(1)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe('1')

      test.push(2)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe('1, 2')

      action(() => {
        test[0] = 0
        test[1] = 1
      })()
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe('0, 1')
    })
    it('map', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.map(e => e * e).join(', ')))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe('')

      test.push(1)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe('1')

      test.push(2)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe('1, 4')

      test.push(3)
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe('1, 4, 9')
    })
    it('every', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.every(e => e > 10)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(true)

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(true)

      test.push(8)
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe(false)
    })
    it('fill', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.fill(true)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual([])

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual([true])

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toEqual([true, true])

      test.push(8)
      expect(observer.length).toBe(4)
      expect(observer[3]).toEqual([true, true, true])
      expect(observer[0]).toEqual([true, true, true])
    })
    it('filter', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.filter(e => e < 10)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toEqual([])

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toEqual([])

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toEqual([])

      test.push(8)
      expect(observer.length).toBe(4)
      expect(observer[3]).toEqual([8])

      test[0] = 9
      expect(observer.length).toBe(5)
      expect(observer[4]).toEqual([9, 8])
    })
    it('find', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.find(e => e < 10)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(undefined)

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(undefined)

      test.push(8)
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe(8)
    })
    it('findIndex', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.findIndex(e => e < 10)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(-1)

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(-1)

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(-1)

      test.push(8)
      expect(observer.length).toBe(4)
      expect(observer[3]).toBe(2)
    })
    it('includes', () => {
      const observer = []
      const test = mazzard([])

      mazzard(() => observer.push(test.includes(13)))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(false)

      test.push(42)
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(false)

      test.push(13)
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(true)
    })
  })
  describe('array plugin', () => {
    it('concat', () => {
      const test = mazzard([1, 2], array).concat([3, 4])
      expect(test).toEqual([1, 2, 3, 4])
      expect(test[MAZZARD]).toBe(true)
      expect(test.concat([5, 6])[MAZZARD]).toBe(true)
    })
  })
  describe('class', () => {
    describe('empty', () => {
      it('instance of mazzard', () => {
        const core = new mazzard()
        expect(core instanceof mazzard).toBe(true)
      })
    })
    describe('function', () => {
      it('instance of mazzard', () => {
        const core = new mazzard(() => {})
        expect(core instanceof mazzard).toBe(false)
      })
    })
    describe('object', () => {
      it('instance of mazzard', () => {
        const core = new mazzard({})
        expect(core instanceof mazzard).toBe(false)
      })
    })
  })
})