import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import _ from 'lodash';

import { asyncForEach, asyncMapValues } from '../utils';

export const reduceTransforms = arr => async params => {
  await asyncForEach(arr, async func => {
    if (func) {
      params = await func(params);
    }
  });
  return params;
};

export async function applyInputTransform(context) {
  return async (value, type) => {
    if (type instanceof GraphQLList) {
      return await Promise.all(
        value.map(val => applyInputTransform(context)(val, type.ofType))
      );
    } else if (type instanceof GraphQLNonNull) {
      return applyInputTransform(context)(value, type.ofType);
    }
  
    let fields = type._fields;
    if (!fields) return value;
    let result = {};
    await asyncForEach(_.keys(value), async key => {
      let field = fields[key];
      if (!field) {
        throw 'Wrong type for input provided';
      }
      let val = value[key];
      result = {
        ...result,
        ...(field.mmTransform
          ? await field.mmTransform({
            [key]: val,
          }, context)
          : {
            [key]: await applyInputTransform(context)(val, field.type),
          }),
      };
    });
    await asyncForEach(_.keys(fields), async fieldName => {
    
    });
    return result;
  }
}

export function appendTransform(field, handler, functions) {
  if (!field[handler]) field[handler] = {};
  field[handler] = { ...field[handler], ...functions };
}
