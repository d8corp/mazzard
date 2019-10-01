/* global it, describe, expect */
const mazzard = require('./index.js').default
const action = require('./index.js').action

describe('mazzard', () => {
  describe('simple', () => {
    it('empty', () => {
      expect(mazzard()).toBe(undefined)
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
  describe('observer', () => {
    it('simple', () => {
      const observer = []
      const test = mazzard({})
      mazzard(() => observer.push(test.testField))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.someField = true
      expect(observer.length).toBe(1)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.testField = 'test'
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe('test')
    })
    it('stop', () => {
      const observer = []
      const test = mazzard({})
      let stopMessage

      mazzard(stop => {
        if (test.stop) {
          stopMessage = test.stop
          stop()
        } else {
          observer.push(test.testField)
        }
      })

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.someField = true
      expect(observer.length).toBe(1)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.testField = 1
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(1)

      test.stop = 'stop message'
      expect(observer.length).toBe(3)
      expect(stopMessage).toBe('stop message')

      test.testField = 2
      expect(observer.length).toBe(3)
    })
    it('stop outside', () => {
      const observer = []
      const test = mazzard({})

      const stop = mazzard(() => observer.push(test.testField))

      expect(observer.length).toBe(1)
      expect(observer[0]).toBe(undefined)

      test.testField = true
      expect(observer.length).toBe(2)
      expect(observer[1]).toBe(true)

      test.testField = 1
      expect(observer.length).toBe(3)
      expect(observer[2]).toBe(1)

      stop()
      test.testField = 2
      expect(observer.length).toBe(3)
    })
    it('the same value', () => {
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