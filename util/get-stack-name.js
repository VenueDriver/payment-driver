function getStackName(options,app){
  const {config,args} = options;
  return `${config.project_name}-${app}-${args.environment}`.replace(/[\W_]+/gi,'-').replace(/\-$/gi,'');
}

module.exports = getStackName;
