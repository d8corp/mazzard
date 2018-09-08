const activeReactions = new Set()
const reactionsList = new Map()
let activeReaction
let countActiveReactions = 0

const SET_LIST_HANDLER = {
  get (target, property, receiver) {
    if (!target[property]) {
      target[property] = new Set()
    }
    return Reflect.get(target, property, receiver)
  }
}
class SetList {
  constructor () {
    return new Proxy(Object.create(null), SET_LIST_HANDLER)
  }
}

function callActionReactions () {
  if (!countActiveReactions) {
    activeReactions.forEach(reaction => {
      reaction()
    })
    activeReactions.clear()
  }
}

function Mazzard (value, isAction) {
  if (!value) value = this
  if (!value || typeof value !== 'object' || typeof value !== 'function') return value
  const propertyReactions = new SetList()
  const cache = Object.create(null)
  // const actionValues = Object.create(null)
  const apply = isAction ? callback => callback() : callback => {
    const prevReaction = activeReaction
    activeReaction = result
    reactionsList.get(result).forEach(reactions => {
      reactions.delete(result)
    })
    callback()
    activeReaction = prevReaction
  }

  const result = new Proxy(value, {
    apply (target, thisValue, args) {
      countActiveReactions++
      apply(() => Reflect.apply(target, thisValue, args))
      countActiveReactions--
      callActionReactions()
    },
    get (target, property, receiver) {
      if (activeReaction) {
        if (!isAction) {
          reactionsList.get(activeReaction).add(propertyReactions[property])
        }
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
      let result = Mazzard(() => Reflect.get(target, property, receiver), true)
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
  reactionsList.set(result, new Set())
  return result
}