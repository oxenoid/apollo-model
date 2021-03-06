import gql from 'graphql-tag';
import _ from 'lodash';
import { SchemaDirectiveVisitor } from 'graphql-tools';

import { appendTransform } from '../../inputTypes/utils';
import * as HANDLER from '../../inputTypes/handlers';
import { INPUT_TYPE_KIND } from '../../inputTypes/kinds';
import { combineResolvers } from '../../utils';

export const typeDef = gql`
  directive @db(name: String!, defaultValue: String = null) on FIELD_DEFINITION
`;

class DirectiveDB extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { name } = this.args;
    appendTransform(field, HANDLER.TRANSFORM_INPUT, {
      [INPUT_TYPE_KIND.CREATE]: this._renameTransform(field.name, name),
      [INPUT_TYPE_KIND.UPDATE]: this._renameTransform(field.name, name),
      [INPUT_TYPE_KIND.WHERE]: this._renameTransform(field.name, name),
    });

    appendTransform(field, HANDLER.TRANSFORM_TO_INPUT, {
      [INPUT_TYPE_KIND.ORDER_BY]: ({ field }) => [
        {
          name: `${field.name}_ASC`,
          value: { [name]: 1 },
        },
        {
          name: `${field.name}_DESC`,
          value: { [name]: -1 },
        },
      ],
    });
  }

  _renameTransform = (fieldName, dbName) => params => {
    let value = params[fieldName];
    return {
      ..._.omit(params, fieldName),
      [dbName]: value,
    };
  };
}

const DirectiveDBResolver = (next, source, args, ctx, info) => {
  const { name } = args;
  info.fieldName = name;
  return next();
};

export const schemaDirectives = {
  db: DirectiveDB,
};

export const directiveResolvers = {
  db: DirectiveDBResolver,
};
