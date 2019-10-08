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
function observe (value, plugin, cache = Object.create(null), reactions = Object.create(null)) {
  return new Proxy(value, {
    get (target, property, receiver) {
      if (property === MAZZARD) return true
      if (activeReaction) {
        if (!(property in reactions)) {
          reactions[property] = new Set()
        }
        reactions[property].add(activeReaction)
      }
      if (property in cache) {
        return cache[property]
      }
      observer(stop => {
        let result = Reflect.get(target, property, receiver)
        if (result !== null) {
          const type = typeof result
          if (type === 'object') {
            if ((!result.constructor || result.constructor === Object)) {
              if (!result[MAZZARD]) {
                result = observe(result, plugin)
              }
            } else if (plugin) {
              result = plugin(result, cache, reactions)
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
      return true
    }
  })
}
function defaultPlugin (value) {
  return value instanceof Array && !value[MAZZARD] ? observe(value, defaultPlugin) : value
}
function mazzard (value, plugin = defaultPlugin) {
  if (value === null) return value
  const type = typeof value
  if (type === 'object') {
    if ((!value.constructor || value.constructor === Object)) {
      return value[MAZZARD] ? value : observe(value, plugin)
    } else {
      return plugin(value)
    }
  } else if (type === 'function') {
    return observer(value)
  } else {
    return value
  }
}
class Mazzard {
  constructor (plugin) {
    return mazzard(this, plugin || defaultPlugin)
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