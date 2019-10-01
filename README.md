# Mazzard
### Install
```bash
npm i mazzard
```
Next, we will use `mazzard` which means we imported it from `mazzard`
```javascript
import mazzard from 'mazzard'

mazzard() // undefined
```

### Unexpected arguments
`mazzard` returns the first argument as is, if it is not function or simple object
```javascript
mazzard(1) // 1
mazzard('1') // '1'
mazzard(false) // false
mazzard(null) // null
mazzard(NaN) // NaN
mazzard(Symbol('test')) // Symbol('test')
mazzard(new Map()) // instance of Map
```

### Observable object
You get the observable object if the first argument is simple object
```javascript
const observable = mazzard({test: 'success'})
console.log(observable.test)
// > 'success'
```
All objects inside observable is observable.
```javascript
const test = mazzard({observableField: {}})
test // is observable object
test.observableField // is observable object
```

### Observer
To have reactions on changes of observable object, use `mazzard` with a function as the first argument.
The function is observer and runs immediately.
```javascript
const test = mazzard({})

mazzard(
  () => console.log(test.testField) // this is observer
)
// > undefined

test.testField = 'success'
// > 'success'
```
Observer runs each time when you change observable fields.  
You may stop the watching with the first argument of observer.
```javascript
const test = mazzard({})

mazzard(stop => {
  if (test.stop) {
    console.log('stop', test.stop)
    stop()
  } else {
    console.log(test.testField)
  }
})
// > undefined

test.testField = 'success'
// > 'success'

test.testField = true
// > true

test.stop = 'test message'
// > 'stop', 'test message'

test.testField = 'test'
// nothing happens
```
Also, you may stop it with that mazzard returns
```javascript
const stop = mazzard(() => {})
stop()
```
If you set the same value which a field have then reaction will not be called
```javascript
const test = mazzard({})

mazzard(() => console.log(test.testField))
// > undefined

test.testField = true
// > true

test.testField = true
// nothing happens
```
### United changes
If you wanna have only one reaction of observer on several changes, you may use a method of observable object
```javascript
const test = mazzard({
  update (field1, field2) {
    test.field1 = field1
    test.field2 = field2
  }
})

mazzard(() => {
  console.log(test.field1, test.field2)
})
// > undefined, undefined

test.field1 = 'field1'
// > 'field1', undefined

test.field2 = 'field2'
// > 'field1', 'field2'

test.update(1, 2)
// > 1, 2
```
You may unite changes with `action` from `mazzard`
```javascript
import {action} from 'mazzard'

const test = mazzard({})

const update = action((field1, field2) => {
  test.field1 = field1
  test.field2 = field2
})

mazzard(() => console.log(test.field1, test.field2))
// > undefined, undefined

update(1, 2)
// > 1, 2
```
The same will happen for setters
```javascript
const test = mazzard({
  set fullName (value) {
    const [name, secondName] = value.split(' ')
    this.name = name
    this.secondName = secondName
  }
})

mazzard(() => console.log(test.name, test.secondName))
// > undefined, undefined

test.fullName = 'Mike Mighty'
// > 'Mike', 'Mighty'
```
### Computed value
Use getters in observable to have computed value with caching
```javascript
const test = mazzard({
  get fullName () {
    return this.name && this.secondName ? `${this.name} ${this.secondName}` : null
  }
})

mazzard(() => console.log(test.fullName))
// > null

test.name = 'Mike'
// nothing happens

test.secondName = 'Mighty'
// > 'Mike Mighty'
```
