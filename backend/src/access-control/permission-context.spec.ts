import { permissionKeysFromRoles, scopedActor } from './permission-context';
const actor={sub:'u',companyId:'c',email:'u@example.test',role:'employee',permissions:['org-masters.departments.findAll','companies.create','access-control.createUser']};
describe('custom role permissions',()=>{
 it('scopes delegation to exactly the granted organization operation',()=>{
  expect(scopedActor(actor,'org-masters.departments.findAll').delegatedAccess).toBe(true);
  for(const key of ['org-masters.departments.delete','companies.create','access-control.createUser','unknown'])expect(scopedActor(actor,key).delegatedAccess).toBe(false);
 });
 it('combines only active roles and discards nondelegable keys',()=>{
  expect(permissionKeysFromRoles([{role:{isActive:true,permissionKeys:actor.permissions}},{role:{isActive:false,permissionKeys:['org-masters.departments.create']}}])).toEqual(['org-masters.departments.findAll']);
 });
});
