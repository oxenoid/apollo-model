import { GraphQLBoolean, getNamedType, isCompositeType } from 'graphql';
import { IAMQuerySelector } from '../../types';

export const LTSelector: IAMQuerySelector = {
  isApplicable(field) {
    const namedType = getNamedType(field.type);
    return ['Int', 'Float', 'Date', 'String'].includes(namedType.toString());
  },
  getFieldFactory() {
    return {
      getFieldName(field) {
        return `${field.name}_lt`;
      },
      getField(field, schemaInfo) {
        const namedType = getNamedType(field.type);

        let type;
        if (!isCompositeType(namedType)) {
          type = namedType;
        }
        return {
          name: this.getFieldName(field),
          type,
          mmTransform: params => params,
        };
      },
    };
  },
};

// getTransformInput() {
//   const fieldName = this.getFieldName();
//   return input => ({
//     [fieldName]: { $lt: extractValue(input) },
//   });
// }
