"use strict";
let activeReactions
let activeReaction

function Mazzard (value = this, actionMode) {
  if (value === null) return value
  if (value === window) return
  const type = typeof value
  if (type === 'object') {
    const reactions = Object.create(null)
    const cache = Object.create(null)
    return new Proxy(value, {
      get (target, property, receiver) {
        if (activeReaction) {
          if (!(property in reactions)) {
            reactions[property] = new Set()
          }
          reactions[property].add(activeReaction)
          if (property in cache) {
            return cache[property]
          }
          Mazzard(dispatch => {
            const result = Mazzard(Reflect.get(target, property, receiver), true)
            if (property in cache) {
              if (cache[property] !== result) {
                cache[property] = result
                dispatch()
                const propReactions = reactions[property]
                delete reactions[property]
                if (activeReactions) {
                  propReactions.forEach(reaction => activeReactions.add(reaction))
                } else {
                  propReactions.forEach(reaction => reaction())
                }
              }
            } else {
              cache[property] = result
            }
          })
          return cache[property]
        }
        return Reflect.get(target, property, receiver)
      },
      set (target, property, value, receiver) {
        if (cache[property] === value) {
          return true
        }
        delete cache[property]
        Reflect.set(target, property, value, receiver)
        const propReactions = reactions[property]
        delete reactions[property]
        if (activeReactions) {
          propReactions.forEach(reaction => activeReactions.add(reaction))
        } else if (propReactions) {
          propReactions.forEach(reaction => reaction())
        }
        return true
      }
    })
  } else if (type === 'function') {
    if (actionMode) {
      return function () {
        if (activeReactions) {
          return value.apply(this, arguments)
        } else {
          activeReactions = new Set()
          const result = value.apply(this, arguments)
          activeReactions.forEach(reaction => reaction())
          activeReactions = undefined
          return result
        }
      }
    } else {
      let reaction = () => {
        if (reaction) {
          const prevReaction = activeReaction
          activeReaction = reaction
          value(dispatch)
          activeReaction = prevReaction
        }
      }
      const dispatch = () => reaction = undefined
      reaction(dispatch)
      return dispatch
    }
  } else {
    return value
  }
}

Object.defineProperty(exports, "__esModule", {
  value: true
})

exports.default = Mazzard