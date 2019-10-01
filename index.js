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
function observe (value, plugin, length) {
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
              } else if (plugin) {
                result = plugin(result, false)
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
      const prevActiveReactions = activeReactions
      activeReactions = new Set()
      Reflect.set(target, property, value, receiver)
      if (prevActiveReactions) {
        activeReactions.forEach(reaction => prevActiveReactions.add(reaction))
      }
      activeReactions = prevActiveReactions
      const propReactions = reactions[property]
      delete reactions[property]
      if (propReactions) {
        if (activeReactions) {
          propReactions.forEach(reaction => activeReactions.add(reaction))
        } else {
          propReactions.forEach(reaction => reaction())
        }
      }
      if (length) {
        const id = Math.abs(property|0)
        if (id + '' === property && cache.length <= id) {
          delete cache.length
          const reactionsLength = reactions.length
          if (reactionsLength) {
            delete reactions.length
            if (activeReactions) {
              reactionsLength.forEach(reaction => activeReactions.add(reaction))
            } else {
              reactionsLength.forEach(reaction => reaction())
            }
          }
        }
      }
      return true
    }
  })
}
function defaultPlugin (value) {
  return value instanceof Array ? observe(value, defaultPlugin, true) : value
}
function mazzard (value, plugin = defaultPlugin) {
  if (value === null) return value
  const type = typeof value
  if (type === 'object') {
    if ((!value.constructor || value.constructor === Object) && !value[MAZZARD]) {
      return observe(value, plugin)
    } else {
      return plugin(value, true)
    }
  } else if (type === 'function') {
    return observer(value)
  } else {
    return value
  }
}
class Mazzard {
  constructor (plugin) {
    return mazzard(this, plugin)
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
exports.defaultPlugin = defaultPlugin