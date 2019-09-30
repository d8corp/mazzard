# mazzard
### Install
```bash
npm i mazzard
```
Next we will use `Mazzard` which means we imported it from `mazzard`
```javascript
import Mazzard from 'mazzard'

Mazzard() // undefined
```

### Primitive
`Mazzard` returns the first argument as is, if it's type is not `function` or `object` (not `null`)
```javascript
Mazzard(1) // 1
Mazzard('1') // '1'
Mazzard(false) // false
Mazzard(null) // null
Mazzard(NaN) // NaN
Mazzard(Symbol('test')) // Symbol('test')
```

### Observable object
You get the observable object if a type of the first argument is `object`
```javascript
const observable = Mazzard({test: 'success'})
return observable.test // 'success'
```
All objects inside observable is observable.
```javascript
const test = Mazzard({observableField: {}})
test // is observable object
test.observableField // is observable object
```

### Observer
To have reactions on changes of observable object, use `Mazzard` with a function as the first argument.
The function is observer and runs immediately.
```javascript
const test = Mazzard({})

Mazzard(
  () => console.log(test.testField) // this is observer
)
// console.log returns undefined

test.testField = 'success'
// console.log returns 'success'
```
Observer runs each time when you change observable fields.  
You may stop watching with the first argument of observer.
```javascript
const test = Mazzard({})

Mazzard(stop => {
  if (test.stop) {
    console.log('stop', test.stop)
    stop()
  } else {
    console.log(test.testField)
  }
})
// console.log returns undefined

test.testField = 'success'
// console.log returns 'success'

test.stop = 'test message'
// console.log returns ('stop', 'test message')
```
Also, you may stop it with that Mazzard returns
```javascript
const stop = Mazzard(() => {})
stop()
```
