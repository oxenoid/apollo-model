//This is autogenerated types kinds
import { uppercaseFirstLetter } from './utils';

export enum INPUT_TYPE_KIND {
  CREATE = 'create',
  WHERE = 'where',
  WHERE_CLEAN = 'whereClean',
  WHERE_UNIQUE = 'whereUnique',
  UPDATE = 'update',
  ORDER_BY = 'orderBy',
  CREATE_INTERFACE = 'interfaceCreate',
  WHERE_INTERFACE = 'interfaceWhere',
  UPDATE_INTERFACE = 'interfaceUpdate',
  WHERE_UNIQUE_INTERFACE = 'interfaceWhereUnique',
  CREATE_ONE_NESTED = 'createOneNested',
  CREATE_MANY_NESTED = 'createManyNested',
  CREATE_ONE_REQUIRED_NESTED = 'createOneRequiredNested',
  CREATE_MANY_REQUIRED_NESTED = 'createManyRequiredNested',

  UPDATE_ONE_NESTED = 'updateOneNested',
  UPDATE_MANY_NESTED = 'updateManyNested',
  UPDATE_ONE_REQUIRED_NESTED = 'updateOneRequiredNested',
  UPDATE_MANY_REQUIRED_NESTED = 'updateManyRequiredNested',

  UPDATE_WITH_WHERE_NESTED = 'updateWithWhereNested',
}

export const getInputTypeName = (typeName: String, kind: INPUT_TYPE_KIND) => {
  return `${typeName}${uppercaseFirstLetter(kind)}Input`;
};
