const FormTemplate = require('./model');

class FormTemplateValidator {

  constructor(){}

  validate(model,formData){
    let errors = [];
    for( const key in formData ){
      let modelField = model.fields.find( obj => obj.name == key);
      if(modelField){
        let field       = formData[key];

        // VALIDATE FIELD TYPE
        let validType = true;
        switch(modelField.type){
          case "text":
            validType = typeof field == "string"
            break;
          case "number":
            validType = typeof parseFloat(field) == "number"
            break;
        }
        if(!validType){
          errors.push(`${key.toUpperCase()} information is incorrect. It should be a ${modelField.type}`);
        }

        // VALIDATE REQUIRED
        if( modelField.required &&
          ( field == "" || field == undefined || field == null )
        ){
          errors.push(`${key.toUpperCase()} is required.`);
        }

      }
    }
    return errors;
  }

}

module.exports = FormTemplateValidator;
module.exports.FormTemplate = FormTemplate;
