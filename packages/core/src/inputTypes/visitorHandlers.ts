import R from 'ramda';
import { AMDataContext } from '../execution/contexts/data';
import { AMListValueContext } from '../execution/contexts/listValue';
import { AMObjectFieldContext } from '../execution/contexts/objectField';
import { AMSelectorContext } from '../execution/contexts/selector';
import { AMOperation } from '../execution/operation';
import { AMModelField, AMVisitable } from '../definitions';
import { getLastOperation, getFieldPath } from '../execution/utils';
import { UserInputError } from 'apollo-server';

export const defaultObjectFieldVisitorHandler = (
  fieldName: string,
  field?: AMModelField
) =>
  <AMVisitable>{
    amEnter(node, transaction, stack) {
      const action = new AMObjectFieldContext(fieldName, field);
      stack.push(action);
    },
    amLeave(node, transaction, stack) {
      const context = stack.pop() as AMObjectFieldContext;

      const lastInStack = R.last(stack);
      if (
        lastInStack instanceof AMDataContext ||
        lastInStack instanceof AMObjectFieldContext ||
        lastInStack instanceof AMSelectorContext
      ) {
        lastInStack.addValue(context.fieldName, context.value);
      }
    },
  };

export const updateObjectFieldVisitorHandler = (fieldName: string) =>
  <AMVisitable>{
    amEnter(node, transaction, stack) {
      const action = new AMObjectFieldContext(fieldName);
      stack.push(action);
    },
    amLeave(node, transaction, stack) {
      const operation = getLastOperation(stack);
      const path = getFieldPath(stack, operation);

      const context = stack.pop() as AMObjectFieldContext;
      const set = operation.data['$set'] || {};
      set[path] = context.value;
      operation.data['$set'] = set;
    },
  };

export const whereTypeVisitorHandler = (options = { emptyAllowed: true }) =>
  <AMVisitable>{
    amEnter(node, transaction, stack) {
      const context = new AMSelectorContext();
      stack.push(context);
    },
    amLeave(node, transaction, stack) {
      const context = stack.pop() as AMSelectorContext;
      const lastInStack = R.last(stack);

      if (
        !options.emptyAllowed &&
        Object.values(R.omit(['aclWhere'], context.selector)).length === 0
      ) {
        throw new UserInputError(
          `WhereUniqueType cannot be empty. Provided value is ${JSON.stringify(
            context.selector,
            null,
            2
          )}`
        );
      }

      if (context.selector.aclWhere) {
        context.selector = {
          $and: [
            R.omit(['aclWhere'], context.selector),
            context.selector.aclWhere,
          ],
        };
      }

      if (lastInStack instanceof AMOperation) {
        lastInStack.setSelector(context);
      } else if (lastInStack instanceof AMListValueContext) {
        lastInStack.addValue(context.selector);
      } else if (lastInStack instanceof AMObjectFieldContext) {
        lastInStack.setValue(context.selector);
      }
    },
  };
