/**
 * Copyright (c) 2019-present, Mikhail Lysikov.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {observe, getActiveReactions, MAZZARD} from '.'

function array (value) {
  if (value instanceof Array && !value[MAZZARD]) {
    const cache = Object.create(null)
    const reactions = Object.create(null)
    return new Proxy(observe(value, array, cache, reactions), {
      get (target, property, receiver) {
        if (property === 'concat') {
          const concat = Reflect.get(target, property, receiver)
          return function () {
            return array(concat.apply(this, arguments))
          }
        }
        return Reflect.get(target, property, receiver)
      },
      set (target, property, value, receiver) {
        Reflect.set(target, property, value, receiver)
        const id = Math.abs(property|0)
        if (id + '' === property && Reflect.get(target, 'length', receiver) <= id) {
          delete cache.length
          const reactionsLength = reactions.length
          if (reactionsLength) {
            delete reactions.length
            const activeReactions =  getActiveReactions()
            if (activeReactions) {
              reactionsLength.forEach(reaction => activeReactions.add(reaction))
            } else {
              reactionsLength.forEach(reaction => reaction())
            }
          }
        }
        return true
      }
    })
  }
  return value
}

export default array