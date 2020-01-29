import { GraphQLNonNull, isInterfaceType } from 'graphql';
import R from 'ramda';
import { AMUpdateOperation } from '../execution/operations/updateOperation';
import { AMUpdateTypeFactory } from '../inputTypes/update';
import { AMWhereUniqueTypeFactory } from '../inputTypes/whereUnique';
import { AMWhereACLTypeFactory } from '../inputTypes/whereACL';
import { resolve } from '../resolve';
import {
  AMField,
  AMModelType,
  IAMFieldFactory,
  IAMMethodFieldFactory,
  GraphQLOperationType,
} from '../definitions';
import { AMSelectorContext } from '../execution/contexts/selector';
import { AMWhereTypeFactory } from '../inputTypes/where';
import { AMInterfaceWhereUniqueTypeFactory } from '../inputTypes/interfaceWhereUnique';

export const AMModelUpdateMutationFieldFactory: IAMMethodFieldFactory = {
  getOperationType() {
    return GraphQLOperationType.Mutation;
  },
  getFieldName(modelType: AMModelType): string {
    return R.concat('update')(modelType.name);
  },
  getField(modelType: AMModelType, schemaInfo) {
    return <AMField>{
      name: this.getFieldName(modelType),
      description: '',
      isDeprecated: false,
      type: modelType,
      args: [
        {
          name: 'data',
          type: new GraphQLNonNull(
            schemaInfo.resolveFactoryType(modelType, AMUpdateTypeFactory)
          ),
        },
        {
          name: 'where',
          type: new GraphQLNonNull(
            schemaInfo.resolveFactoryType(
              modelType,
              isInterfaceType(modelType)
                ? AMWhereUniqueTypeFactory //AMInterfaceWhereUniqueTypeFactory
                : AMWhereUniqueTypeFactory
            )
          ),
        },
      ],
      amEnter(node, transaction, stack) {
        const operation = new AMUpdateOperation(transaction, {
          many: false,
          collectionName: modelType.mmCollectionName,
        });
        stack.push(operation);
      },
      amLeave(node, transaction, stack) {
        const context = stack.pop() as AMUpdateOperation;
        if (modelType.mmDiscriminatorField && modelType.mmDiscriminator) {
          if (!context.selector) {
            context.setSelector(new AMSelectorContext());
          }

          context.selector.addValue(
            modelType.mmDiscriminatorField,
            modelType.mmDiscriminator
          );
        }
      },
      resolve: resolve,
    };
  },
};
