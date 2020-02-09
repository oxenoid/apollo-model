import TypeWrap from '@apollo-model/type-wrap';
import {
  DirectiveNode,
  getNamedType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLString,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
} from 'graphql';
import { makeExecutableSchema as makeGraphQLSchema } from 'graphql-tools';
import _ from 'lodash';
import appendField from './appendField';
import { AMModelType, GraphQLOperationType, AMOptions } from './definitions';
import { AMFederationEntitiesFieldFactory } from './federation/entitiesField';
import InitialScheme from './initialScheme';
import { AMModelCreateMutationFieldFactory } from './modelMethods/createMutation';
import { AMModelDeleteManyMutationFieldFactory } from './modelMethods/deleteManyMutation';
import { AMModelDeleteOneMutationFieldFactory } from './modelMethods/deleteOneMutation';
import { AMModelUpdateMutationFieldFactory } from './modelMethods/updateMutation';
import { AMModelConnectionQueryFieldFactory } from './modelMethods/connectionQuery';
import { AMModelMultipleQueryFieldFactory } from './modelMethods/multipleQuery';
import { AMModelSingleQueryFieldFactory } from './modelMethods/singleQuery';
import Modules from './modules';
import { postInit } from './postInit';
import { prepare } from './prepare/prepare';
import { getDirective } from './utils';
export * from './definitions';

const { printSchema } = require('@apollo/federation');

function isAMModelType(type: GraphQLNamedType): type is AMModelType {
  let typeWrap = new TypeWrap(type);
  return (
    getDirective(type, 'model') || typeWrap.interfaceWithDirective('model')
  );
}

function hasTypeFields(
  type: GraphQLNamedType
): type is GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType {
  return isObjectType(type) || isInputObjectType(type) || isInterfaceType(type);
}

type AMModule = any;

export default class ModelMongo {
  Modules: AMModule[];
  options?: AMOptions;

  constructor(params: { options?: AMOptions; modules?: AMModule[] } = {}) {
    this.Modules = [...Modules, ...(params.modules ? params.modules : [])];
    this.options = params.options;
  }

  generateKeyDirective(fields): DirectiveNode {
    return {
      kind: 'Directive',
      name: { kind: 'Name', value: 'key' },
      arguments: [
        {
          kind: 'Argument',
          name: { kind: 'Name', value: 'fields' },
          value: {
            kind: 'StringValue',
            value: fields,
            block: false,
          },
        },
      ],
    };
  }

  buildFederatedSchema = params => {
    const schema = this.makeExecutableSchema(params);

    Object.values(schema.getTypeMap()).forEach(type => {
      let typeWrap = new TypeWrap(type);
      if (isAMModelType(type)) {
        if (!typeWrap.isAbstract()) {
          Object.values(type.getFields()).map(field => {
            if (getDirective(field, 'unique')) {
              type.astNode = {
                ...type.astNode,
                directives: [
                  ...type.astNode.directives,
                  this.generateKeyDirective(field.name),
                ],
              };
            }
          });
        }
      }
    });

    const sdl = printSchema(schema);

    const _Service = new GraphQLObjectType({
      name: '_Service',
      fields: () => ({
        sdl: {
          name: 'sdl',
          type: GraphQLString,
        },
      }),
    });
    schema.getTypeMap()._Service = _Service;
    schema.getQueryType().getFields()._service = {
      name: '_service',
      description: '',
      args: [],
      isDeprecated: false,
      type: _Service,
      resolve: () => ({
        sdl,
      }),
    };

    appendField(
      schema,
      schema.getQueryType(),
      AMFederationEntitiesFieldFactory,
      null,
      this.options
    );

    return schema;
  };

  makeExecutableSchema = params => {
    let {
      schemaDirectives = {},
      directiveResolvers = {},
      resolvers = {},
      typeDefs = [],
    } = params;

    let fieldFactoriesMap = {};
    let fieldVisitorEventsMap = {};

    if (!Array.isArray(typeDefs)) typeDefs = [typeDefs];

    typeDefs = [InitialScheme, ...typeDefs];

    this.Modules.forEach(module => {
      if (module.typeDef) typeDefs.push(module.typeDef);
      if (module.typeDefs) typeDefs.push(module.typeDefs);

      if (module.resolvers) resolvers = _.merge(resolvers, module.resolvers);
      if (module.schemaDirectives)
        schemaDirectives = _.merge(schemaDirectives, module.schemaDirectives);
      if (module.directiveResolvers) {
        directiveResolvers = _.merge(
          directiveResolvers,
          module.directiveResolvers
        );
      }

      if (module.fieldFactoriesMap) {
        fieldFactoriesMap = _.merge(
          fieldFactoriesMap,
          module.fieldFactoriesMap
        );
      }
      if (module.fieldVisitorEventsMap) {
        fieldVisitorEventsMap = _.merge(
          fieldVisitorEventsMap,
          module.fieldVisitorEventsMap
        );
      }
    });

    let modelParams = {
      ...params,
      typeDefs,
      schemaDirectives,
      directiveResolvers,
      resolvers,
      resolverValidationOptions: {
        requireResolversForResolveType: false,
      },
    };

    let schema = makeGraphQLSchema(modelParams);
    // let schema = buildFederatedSchema(modules);

    prepare(schema, { fieldFactoriesMap, fieldVisitorEventsMap });

    Object.values(schema.getTypeMap()).forEach(type => {
      // this._onSchemaInit(type);

      let typeWrap = new TypeWrap(type);
      if (isAMModelType(type)) {
        if (!typeWrap.isAbstract()) {
          // console.log(`Building queries for ${type.name}`);
          [
            AMModelMultipleQueryFieldFactory,
            AMModelSingleQueryFieldFactory,
            AMModelConnectionQueryFieldFactory,
            ...(!isInterfaceType(type)
              ? [AMModelCreateMutationFieldFactory]
              : []),
            AMModelDeleteOneMutationFieldFactory,
            AMModelDeleteManyMutationFieldFactory,
            AMModelUpdateMutationFieldFactory,
          ].forEach(fieldFactory => {
            appendField(
              schema,
              fieldFactory.getOperationType() === GraphQLOperationType.Query
                ? schema.getQueryType()
                : schema.getMutationType(),
              fieldFactory,
              type as AMModelType,
              this.options
            );
          });
        }
      }
    });

    postInit(schema);

    /* resolve field thunks */
    let initialCount;
    do {
      initialCount = Object.values(schema.getTypeMap()).length;
      Object.entries(schema.getTypeMap()).forEach(([name, type]) => {
        if (hasTypeFields(type)) {
          type.getFields();
        }
      });
    } while (initialCount !== Object.values(schema.getTypeMap()).length);
    /* resolve field thunks */

    let typesToRemove = [];
    Object.entries(schema.getTypeMap()).forEach(([name, type]) => {
      if (hasTypeFields(type) && Object.keys(type.getFields()).length == 0) {
        typesToRemove.push(type);
      }
    });

    Object.entries(schema.getTypeMap()).forEach(([name, type]) => {
      if (hasTypeFields(type)) {
        let fields = type.getFields();
        Object.entries(fields).forEach(([name, field]) => {
          if (typesToRemove.includes(getNamedType(field.type))) {
            delete fields[name];
          } else if (field.args) {
            field.args = field.args.filter(
              arg => !typesToRemove.includes(getNamedType(arg.type))
            );
          }
        });
      }
    });
    typesToRemove.forEach(type => {
      delete schema.getTypeMap()[type.name];
    });

    //Remove system directives
    (schema as any)._directives = [];

    return schema;
  };
}
