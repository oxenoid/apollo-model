import {
  buildClientSchema,
  getNamedType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import * as R from 'ramda';
import { IntrospectionResultData } from './definitions';
import _ from 'lodash';

export class IntrospectionResult {
  data: IntrospectionResultData;
  schema: GraphQLSchema;

  constructor(data: IntrospectionResultData) {
    this.data = data;
    this.schema = buildClientSchema({ __schema: this.data.schema });
  }

  getType(typeName: string): GraphQLNamedType {
    return this.schema.getType(typeName);
  }

  getQueryType() {
    return this.schema.getQueryType();
  }

  getMutationType() {
    return this.schema.getMutationType();
  }

  getUpdateType(resourceName: string, key: string) {
    const methodName = `update${resourceName}`;
    return getNamedType(
      this.getMutationType()
        .getFields()
        [methodName].args.find(R.propEq('name', key)).type
    ) as GraphQLInputObjectType;
  }

  getCreateDataType(resourceName: string) {
    const methodName = `create${resourceName}`;
    return getNamedType(
      this.getMutationType()
        .getFields()
        [methodName].args.find(R.propEq('name', 'data')).type
    ) as GraphQLInputObjectType;
  }

  getGetOneWhereType(queryTypeName: string) {
    return getNamedType(
      this.getQueryType()
        .getFields()
        [_.camelCase(queryTypeName)].args.find(R.propEq('name', 'where')).type
    ) as GraphQLInputObjectType;
  }

  getGetManyWhereType(resourceName: string) {
    const sourceType = getNamedType(this.getType(resourceName));
    const typeName = `${resourceName}${
      sourceType instanceof GraphQLInterfaceType ? 'Interface' : ''
    }WhereInput`;
    return getNamedType(
      this.getType(typeName) as GraphQLInputObjectType
    ) as GraphQLInputObjectType;
  }
}
