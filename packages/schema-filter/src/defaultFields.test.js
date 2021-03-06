import DefaultFields from './defaultFields';

let kind = 'Argument';
let name = { kind: 'Name', value: 'data' };
let fields = ['field'];

test('defaultFields', () => {
  const defaults = DefaultFields();
  defaults.add({ name: 'TypeName' }, { name: 'Field1' }, () => 'valueA');
  defaults.add({ name: 'TypeName' }, { name: 'Field2' }, () => 'valueB');

  expect(defaults.get({ name: 'TypeName' })).toEqual({
    Field1: 'valueA',
    Field2: 'valueB',
  });

  expect(defaults.get({ name: 'UnknowneName' })).toEqual(undefined);
});
