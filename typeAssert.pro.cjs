const typeAssert = () => {}

const {
  TypeStrings,
  NullableType,
  SumType,
  ChainType,
  ValueAssertion,
  enableChainAPI,
  preventErrTrace
} = require('./typeAssert.cjs')

module.exports = {
  TypeStrings,
  typeAssert,
  NullableType,
  SumType,
  ChainType,
  ValueAssertion,
  enableChainAPI,
  preventErrTrace
}
