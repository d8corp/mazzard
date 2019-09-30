"use strict"
Object.defineProperty(exports, "__esModule", {
  value: true
})

let activeReaction
let activeReactions
const MAZZARD = Symbol('Mazzard instance')

function setActiveReaction (value) {
  activeReaction = value
}
function getActiveReaction () {
  return activeReaction
}
function setActiveReactions (value) {
  activeReactions = value
}
function getActiveReactions () {
  return activeReactions
}

function observer (value) {
  let reaction = () => {
    if (reaction) {
      const prevReaction = activeReaction
      activeReaction = reaction
      value(stop)
      activeReaction = prevReaction
    }
  }
  const stop = () => reaction = undefined
  reaction(stop)
  return stop
}
function action (value) {
  return function () {
    if (activeReactions) {
      return value.apply(this, arguments)
    } else {
      const reactions = activeReactions = new Set()
      const result = value.apply(this, arguments)
      // TODO: check do we need clear activeReactions before it runs
      activeReactions = undefined
      reactions.forEach(reaction => reaction())
      return result
    }
  }
}
function observe (value, plugins) {
  const reactions = Object.create(null)
  const cache = Object.create(null)
  return new Proxy(value, {
    get (target, property, receiver) {
      if (property === MAZZARD) return true
      if (activeReaction) {
        if (!(property in reactions)) {
          reactions[property] = new Set()
        }
        reactions[property].add(activeReaction)
        if (property in cache) {
          return cache[property]
        }
        observer(stop => {
          let result = Reflect.get(target, property, receiver)
          if (result !== null) {
            const type = typeof result
            if (type === 'object') {
              if ((!result.constructor || result.constructor === Object) && !result[MAZZARD]) {
                result = observe(result)
              } else if (plugins) {
                const next = Symbol('Mazzard next')
                for (const plugin of plugins) {
                  const pluginResult = plugin(value, next)
                  if (pluginResult !== next) {
                    result = pluginResult
                    break
                  }
                }
                return value
              }
            } else if (type === 'function') {
              result = action(result)
            }
          }
          if (property in cache) {
            if (cache[property] !== result) {
              cache[property] = result
              stop()
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
      } else {
        const result = Reflect.get(target, property, receiver)
        return typeof result === 'function' ? action(result) : result
      }
    },
    set (target, property, value, receiver) {
      if (cache[property] === value) {
        return true
      }
      delete cache[property]
      Reflect.set(target, property, value, receiver)
      const propReactions = reactions[property]
      delete reactions[property]
      if (propReactions) {
        if (activeReactions) {
          propReactions.forEach(reaction => activeReactions.add(reaction))
        } else {
          propReactions.forEach(reaction => reaction())
        }
      }
      return true
    }
  })
}
function mazzard (value, plugins) {
  if (value === null) return value
  const type = typeof value
  if (type === 'object') {
    if ((!value.constructor || value.constructor === Object) && !value[MAZZARD]) {
      return observe(value, plugins)
    } else if (plugins) {
      const next = Symbol('Mazzard next')
      for (const plugin of plugins) {
        const result = plugin(value, next)
        if (result !== next) {
          return result
        }
      }
      return value
    } else {
      return value
    }
  } else if (type === 'function') {
    return observer(value)
  } else {
    return value
  }
}
class Mazzard {
  constructor (plugins) {
    return mazzard(this, plugins)
  }
}

exports.default = mazzard
exports.mazzard = mazzard
exports.Mazzard = Mazzard
exports.observer = observer
exports.action = action
exports.observe = observe
exports.MAZZARD = MAZZARD
exports.setActiveReaction = setActiveReaction
exports.getActiveReaction = getActiveReaction
exports.setActiveReactions = setActiveReactions
exports.getActiveReactions = getActiveReactions