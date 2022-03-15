import { typeAssert, enableChainAPI, preventErrTrace } from './typeAssert.js'

preventErrTrace(true)
enableChainAPI()

typeAssert(1, 'number')
typeAssert('2', 'string')

const expectFailure = testedCode => {
  try {
    testedCode()
    console.error('expected failure not caught')
    process.exit(-1)
  } catch (e) {
    console.info('expected failure caught:', e)
  }
}

expectFailure(() => typeAssert(2, 'string'))

typeAssert({ x: 1, y: '3' }, 'object')
typeAssert({ x: 1, y: '3' }, {})
typeAssert({ x: 1, y: '3' }, { x: 'number', y: 'string' })

// By this time, arrays are also considered a kind of 'object'.
// this may change in further editions
typeAssert([], 'object')
typeAssert([], {})

expectFailure(() => typeAssert([], { x: 'number' }))
expectFailure(() => typeAssert({ x: 1, y: '2' }, { x: 'number', y: 'number' }))

typeAssert([1, 2, 3], 'Array')
typeAssert([1, 2, 3], [])
typeAssert([1, 2, 3], ['number'])
typeAssert(['1', '2', '3'], ['string'])

expectFailure(() => typeAssert({}, []))
expectFailure(() => typeAssert({}, 'Array'))
expectFailure(() => typeAssert([1, 2, 3], ['string']))

const sumAssertion = 'string'.sumWith('number')
typeAssert('abc', sumAssertion)
typeAssert(123, sumAssertion)

expectFailure(() => typeAssert(() => 114514, sumAssertion))

const nullableAssertion = { x: 'number', y: 'function' }.orNull()
typeAssert({ x: 114, y: () => 514 }, nullableAssertion)
typeAssert(null, nullableAssertion)

// cannot nest nullable modification
expectFailure(() => 'number?'.orNull())
expectFailure(() => { return { x: 'string' }.orNull().orNull()} )

const compoundAssertion = {
  a: 'number',
  b: 'string',
  c: [
    {
      x: 'function',
      y: 'function'
    }.sumWith({
      x: [],
      y: {}
    }).orNull()
  ]
}

typeAssert({
  a: 114,
  b: '514',
  c: [
    null,
    {
      x: [1, 2, 3],
      y: {
        z: '4'
      }
    },
    {
      x: console.log,
      y: Array.prototype.push
    }
  ]
}, compoundAssertion)

typeAssert(5, 'number'.chainWith(x => x > 0 ? true : 'no negative numbers'))
expectFailure(() => typeAssert(-1, 'number'.chainWith(x => x > 0 ? true : 'no negative numbers')))

typeAssert(5, 'number'.assertValue(5))
expectFailure(() => typeAssert(5, 'number'.assertValue(114514)))

console.info('mission accomplished')
