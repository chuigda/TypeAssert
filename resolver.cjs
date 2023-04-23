const { NullableType, SumType, ChainType, ObjectValueAssertion, ValueAssertion } = require('./typeAssert.cjs')

const RefTy = (function () {
    function RefTy(typeName) {
        this.typeName = typeName;
    }

    return RefTy
}())

const resolveTypeReferences = (context) => {
    for (const assertionId in context) {
        const assertion = context[assertionId]
        context[assertionId] = resolveTypeRef(context, assertion)
    }
}

const resolveTypeRef = (context, assertion) => {
    if (assertion instanceof RefTy) {
        return context[assertion.typeName]
    } else if (assertion instanceof NullableType) {
        assertion.origin = resolveTypeRef(context, assertion.origin)
    } else if (assertion instanceof SumType) {
        assertion.types = assertion.types.map(type => resolveTypeRef(context, type))
    } else if (assertion instanceof ChainType) {
        assertion.types = assertion.types.map(type => resolveTypeRef(context, type))
    } else if (assertion instanceof ObjectValueAssertion) {
        assertion.valueAssertion = resolveTypeRef(context, assertion.valueAssertion)
    } else if (assertion instanceof ValueAssertion) {
    } else if (Array.isArray(assertion)) {
        if (assertion.length === 1) {
            assertion[0] = resolveTypeRef(context, assertion[0])
        }
    } else if (typeof assertion === 'object') {
        for (const key in assertion) {
            assertion[key] = resolveTypeRef(context, assertion[key])
        }
    }

    return assertion
}

module.exports = {
    RefTy,
    resolveTypeReferences
}
