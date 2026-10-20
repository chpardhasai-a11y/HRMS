// Source inspection for catalog maintenance and coverage checks; never runs in the API.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
function discoverRoutes(root) {
  const files = discoverFiles(root);
  return files.filter(f=>f.endsWith('.controller.ts')).flatMap(file=>{
    const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
    const decorators=n=>(ts.getDecorators(n)||[]).map(d=>d.expression).filter(ts.isCallExpression);
    const args=(n,name)=>decorators(n).find(d=>d.expression.getText(source)===name)?.arguments;
    const result=[];
    for(const cls of source.statements.filter(ts.isClassDeclaration)){
      const base=args(cls,'Controller')?.[0]?.text;
      if(!base || base==='health') continue;
      for(const m of cls.members.filter(ts.isMethodDeclaration)){
        const route=decorators(m).find(d=>['Get','Post','Patch','Put','Delete'].includes(d.expression.getText(source)));
        if(!route) continue;
        const roles=(args(m,'Roles')||args(cls,'Roles')||[]).map(a=>a.getText(source).split('.').pop());
        const guards=[...(args(cls,'UseGuards')||[]),...(args(m,'UseGuards')||[])].map(a=>a.getText(source));
        if(guards.includes('OrgAdminGuard')) roles.push('org_admin');
        const method=route.expression.getText(source).toUpperCase();
        const endpoint='/'+[base,route.arguments[0]?.text].filter(Boolean).join('/');
        result.push({base,handler:m.name.getText(source),method,endpoint,roles,guards});
      }
    }
    return result;
  });
}
function discoverFiles(root) {
 return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?discoverFiles(path.join(root,e.name)):[path.join(root,e.name)]);
}
module.exports={discoverRoutes};
