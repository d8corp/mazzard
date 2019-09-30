/* global it, describe, expect */
const Mazzard = require('./index.js').default

describe('Mazzard', () => {
  describe('simple', () => {
    it('empty', () => {
      expect(Mazzard()).toBe(undefined)
    })
    it('number', () => {
      expect(Mazzard(0)).toBe(0)
      expect(Mazzard(1)).toBe(1)
      expect(Mazzard(1.2)).toBe(1.2)
      expect(Mazzard(Infinity)).toBe(Infinity)
    })
    it('string', () => {
      expect(Mazzard('')).toBe('')
      expect(Mazzard('1')).toBe('1')
      expect(Mazzard('test')).toBe('test')
    })
    it('null', () => {
      expect(Mazzard(null)).toBe(null)
    })
    it('bool', () => {
      expect(Mazzard(false)).toBe(false)
      expect(Mazzard(true)).toBe(true)
    })
    it('NaN', () => {
      expect(Mazzard(NaN)).toBe(NaN)
    })
    it('Symbol', () => {
      const symbol = Symbol('test')
      expect(Mazzard(symbol)).toBe(symbol)
    })
  })
  describe('observer', () => {
    it('simple', () => {
      const observer = []
      const test = Mazzard({})
      Mazzard(() => observer.push(test.testField))

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
      const test = Mazzard({})
      let stopMessage

      Mazzard(stop => {
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
      const test = Mazzard({})

      const stop = Mazzard(() => observer.push(test.testField))

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
  })
  describe('class', () => {
    describe('empty', () => {
      it('instance of Mazzard', () => {
        const core = new Mazzard()
        expect(core instanceof Mazzard).toBe(true)
      })
    })
    describe('function', () => {
      it('instance of Mazzard', () => {
        const core = new Mazzard(() => {})
        expect(core instanceof Mazzard).toBe(false)
      })
    })
    describe('object', () => {
      it('instance of Mazzard', () => {
        const core = new Mazzard({})
        expect(core instanceof Mazzard).toBe(false)
      })
    })
  })
})