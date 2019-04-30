const cheerio = require('cheerio');

class FormTemplate{

  constructor(html){
    this.html = html;
    this.DOM  = cheerio.load(html);
    this.fields = this.create(html);
  }

  create(html){
    let fields = [];
    const $ = cheerio.load(html);
    $('input,select,textarea').each(function(){
      let field = $(this);
      fields.push({
        name : field.attr('name'),
        type : field.attr('type') || "text",
        required : field.attr('required') || false,
        readonly : field.attr('readonly') || false
      })
    });
    return fields;
  }

}

module.exports = FormTemplate;
