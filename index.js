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
      activeReactions = undefined
      reactions.forEach(reaction => reaction())
      return result
    }
  }
}
function observe (value, plugin, values = Object.create(null), reactions = Object.create(null), valueReactions = Object.create(null), hasReactions = Object.create(null), inCache = Object.create(null)) {
  if (!('reactions' in inCache)) {
    inCache.reactions = new Set()
  }
  return new Proxy(value, {
    get (target, property, receiver) {
      if (property === MAZZARD) return true
      if (activeReaction) {
        if (!(property in reactions)) {
          reactions[property] = new Set()
        }
        if (!(property in valueReactions)) {
          valueReactions[property] = new Set()
        }
        reactions[property].add(activeReaction)
        valueReactions[property].add(activeReaction)
      }
      if (property in values) {
        return values[property]
      }
      observer(() => {
        let result = Reflect.get(target, property, receiver)
        if (result !== null) {
          const type = typeof result
          if (type === 'object') {
            if ((!result.constructor || result.constructor === Object)) {
              if (!result[MAZZARD]) {
                result = observe(result, plugin)
              }
            } else if (plugin) {
              result = plugin(result, values, reactions, valueReactions, hasReactions, inCache)
            }
          } else if (type === 'function') {
            result = action(result)
          }
        }
        if (property in values) {
          if (values[property] !== result) {
            values[property] = result
            const propValueReactions = valueReactions[property]
            if (propValueReactions) {
              const propHasReactions = hasReactions[property]
              const propReactions = reactions[property]
              delete valueReactions[property]
              if (activeReactions) {
                propValueReactions.forEach(reaction => {
                  if (propHasReactions) {
                    propHasReactions.delete(reaction)
                  }
                  propReactions.delete(reaction)
                  activeReactions.add(reaction)
                })
              } else {
                propValueReactions.forEach(reaction => {
                  if (propHasReactions) {
                    propHasReactions.delete(reaction)
                  }
                  propReactions.delete(reaction)
                  reaction()
                })
              }
            }
          }
        } else {
          values[property] = result
        }
      })
      return values[property]
    },
    set (target, property, value, receiver) {
      const prevReactions = activeReactions
      activeReactions = new Set()
      const newProp = !Reflect.has(target, property)
      Reflect.set(target, property, value, receiver)
      const newValue = target[property]
      if (values[property] !== newValue) {
        values[property] = newValue
        const propReactions = reactions[property]
        if (propReactions) {
          const propHasReactions = hasReactions[property]
          const propValueReactions = valueReactions[property]
          reactions[property] = new Set()
          propReactions.forEach(reaction => {
            if (propValueReactions) {
              propValueReactions.delete(reaction)
              inCache.reactions.delete(reaction)
              if (propHasReactions) {
                propHasReactions.delete(reaction)
              }
              activeReactions.add(reaction)
            }
            if (propHasReactions && newProp) {
              propHasReactions.delete(reaction)
              activeReactions.add(reaction)
            } else {
              reactions[property].add(reaction)
            }
          })
        } else if (newProp && inCache.value && inCache.reactions.size) {
          const oldReactions = inCache.reactions
          inCache.reactions = new Set()
          delete inCache.value
          oldReactions.forEach(reaction => activeReactions.add(reaction))
        }
      } else if (newProp && inCache.value && inCache.reactions.size) {
        const oldReactions = inCache.reactions
        inCache.reactions = new Set()
        delete inCache.value
        oldReactions.forEach(reaction => activeReactions.add(reaction))
      }
      if (prevReactions) {
        activeReactions.forEach(reaction => prevReactions.add(reaction))
        activeReactions = prevReactions
      } else {
        const currentReactions = activeReactions
        activeReactions = prevReactions
        currentReactions.forEach(reaction => reaction())
      }
      return true
    },
    has (target, property) {
      if (property === MAZZARD) return true
      if (activeReaction) {
        if (!(property in hasReactions)) {
          hasReactions[property] = new Set()
        }
        if (!(property in reactions)) {
          reactions[property] = new Set()
        }
        hasReactions[property].add(activeReaction)
        reactions[property].add(activeReaction)
      }
      return Reflect.has(target, property)
    },
    deleteProperty (target, property) {
      if (Reflect.has(target, property)) {
        Reflect.deleteProperty(target, property)
        if (property in reactions) {
          const propReactions = reactions[property]
          const propHasReactions = hasReactions[property]
          const propValueReactions = valueReactions[property]
          const updateValue = values[property] !== undefined
          delete reactions[property]
          if (activeReactions) {
            propReactions.forEach(reaction => {
              if (propHasReactions) {
                propHasReactions.delete(reaction)
                propValueReactions.delete(reaction)
                values[property] = undefined
                activeReactions.add(reaction)
              } else if (propValueReactions && updateValue) {
                propValueReactions.delete(reaction)
                values[property] = undefined
                activeReactions.add(reaction)
              }
            })
          } else {
            propReactions.forEach(reaction => {
              if (propHasReactions) {
                propHasReactions.delete(reaction)
                if (propValueReactions) {
                  propValueReactions.delete(reaction)
                  values[property] = undefined
                }
                reaction()
              } else if (propValueReactions && updateValue) {
                propValueReactions.delete(reaction)
                values[property] = undefined
                reaction()
              }
            })
          }
        } else if (inCache.value && inCache.reactions.size) {
          const oldReactions = inCache.reactions
          inCache.reactions = new Set()
          delete inCache.value
          if (activeReactions) {
            oldReactions.forEach(reaction => activeReactions.add(reaction))
          } else {
            oldReactions.forEach(reaction => reaction())
          }
        }
      }
      return true
    },
    ownKeys (target) {
      if (activeReaction) {
        inCache.reactions.add(activeReaction)
      }
      if (inCache.value) {
        return inCache.value
      }
      return inCache.value = Reflect.ownKeys(target)
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
    } else if (plugin) {
      return plugin(value)
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
  constructor (plugin) {
    return observe(this, plugin || defaultPlugin)
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