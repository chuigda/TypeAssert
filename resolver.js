import { NullableType, SumType, ChainType, ObjectValueAssertion } from './typeAssert.cjs'

export const RefTy = (function () {
    function RefTy(typeName) {
        this.typeName = typeName;
    }

    return RefTy
}())

export const resolveTypeReferences = (context) => {
    for (const assertionId in context) {
        const assertion = context[assertionId]
        context[assertionId] = resolveTypeRef(context, assertion)
    }
}

const resolveTypeRef = (context, assertion) => {
    if (assertion instanceof RefTy) {
        return context[assertion.typeName]
    } else if (assertion instanceof NullableType) {
        return new NullableType(resolveTypeRef(context, assertion.origin))
    } else if (assertion instanceof SumType) {
        return new SumType(assertion.types.map(type => resolveTypeRef(context, type)))
    } else if (assertion instanceof ChainType) {
        return new ChainType(assertion.types.map(type => resolveTypeRef(context, type)))
    } else if (assertion instanceof ObjectValueAssertion) {
        return new ObjectValueAssertion(resolveTypeRef(context, assertion.valueAssertion))
    } else if (Array.isArray(assertion)) {
        return assertion.map(type => resolveTypeRef(context, type))
    } else if (typeof assertion === 'object') {
        const result = {}
        for (const key in assertion) {
            result[key] = resolveTypeRef(context, assertion[key])
        }
        return result
    } else {
        return assertion
    }
}
