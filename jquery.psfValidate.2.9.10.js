/* ***********************************************************************
*** PlugIn SaFe Utilitys - Validate vs 2.9.10 - 15/02/2017 - 15:34:07
*** Versão: /1 = Mudança na estrutura; /2 = Mudanças no código, otimizações, variáveis, adições; /3 = Correção de erros;
*** Funções:
***   Faz a validação dos campos do formuário.
*** Forma de Uso:
***   $('form').pSFut_Validate({params});
*** Principais Parametros:
***   action: Página a receber os dados do formulário, em branco executa a própria página;
***   regras{<name>: {req=bool, minlen:number, email: bool} }: Nome dos campos e passa como objeto os parametros req(obrigatório), minLen(quantidade mínima de caracteres), email(obrigatório), target(novo alvo pra focus)
***   mensagens possíveis em regras{}: { msg=string, msgLen:string };
***   useAjax: Se True faz uso de Ajax e emite um alert do conteúdo retornado ou se false emite um submit() no form;
***   useFormData: Uso do objeto FormData para envio de files via Ajax. Não suportado por todos os browsers;
*********************************************************************** */
;(function(a, window, document, undefined) {
  a(function(){
    var pluginName='psfValidate',
        extensionAjax='psfAjax',
        document=window.document,
        defaults={
          fields: {},
          action: '',
          target: '',
          method: 'POST',
          enctype: 'multipart/form-data',
          contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
          processData: true,
          useAjax: false,
          alertType: 'console',
          uiDialog: {},
          showError: true,
          btnSubmit: '',
          btnCancel: '',
          btnSubmitValue: '',
          btnSubmitValueDefault: 'Salvar',
          btnSubmitWait: 'Salvando...',
          btnCancelValue: '',
          btnCancelValueDefault: 'Cancelar',
          cancelFunction: 'BackPage',
          cancelOnEsc: false,
          cancelAlertEsc: [false, true],
          condition: null,
          focusFirst: true,
          formFind: ':input[type!=button]:not(:disabled)',
          useFormData: false,
          ajaxType: 'POST',
          ajaxDataType: 'html',
          ajaxAsync: true,
          ajaxEvents: {beforeSend:null, error: null, success: null, complete: null},
          ajaxAlertData: false,
          validateEvents: {beforeValidate: null, afterValidate:null, beforeSubmit: null, afterSubmit:null},
          changeFieldValues: null,
          clearOnFinish: false,
          version: '2.9.10'
        };

    function Validate(o, e, p) {
      this.configuration = a.extend({}, defaults, o);
      var tValidate = this, cfgs = tValidate.configuration, privates = {};

      tValidate.init = function() {
        // Verifica se as regras foram definidas
        if(Object.keys(cfgs.fields).length==0)
          console.log('Regras não foram definidas!!!');
        if(cfgs.action.length==0 && cfgs.useAjax===true)
          throw { message: 'Ao usar Ajax é necessário definir um valor para "action"!!!'};
        // Define o valor de action e target para o cfgs se forem vazios
        cfgs.action = cfgs.action||cfgs.form[0].action||'';
        cfgs.target = cfgs.target||cfgs.form[0].target||'';
        // Define os botões submit e cancel
        privates.sbm = a(cfgs.form).find(cfgs.btnSubmit);
        privates.cnl = a(cfgs.form).find(cfgs.btnCancel);
        // Adiciona os eventos
        methods.setEvents();
        // Altera foco para a primeira entrada de Texto não desativada
        if(cfgs.focusFirst)
          cfgs.form.find(':input:not(:disabled):not(:hidden):first').focus();
      };

      var methods = {
        // Função Ajax - Envio de informação assincrona.
        Ajax: {
          init: function(params) {
            if(params.toString()=='[object FormData]') {
              cfgs.contentType = false;
              cfgs.processData = false;
            }
            try {
              methods.Gravar(true);
              a.ajax({
                url: cfgs.action,
                dataType: cfgs.ajaxDataType,
                type: cfgs.ajaxType,
                async: cfgs.ajaxAsync,
                data: params,
                contentType: cfgs.contentType,
                processData: cfgs.processData,
                beforeSend: function(jqXHR, settings) {
                  //this == settings // this == ajax
                  if(cfgs.ajaxEvents.beforeSend!==null && typeof cfgs.ajaxEvents.beforeSend=='function')
                    cfgs.ajaxEvents.beforeSend.call(this, {jqXHR: jqXHR, settings: settings}, cfgs.form);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                  // this == ajax
                  if(cfgs.ajaxEvents.error!==null && typeof cfgs.ajaxEvents.error=='function')
                    cfgs.ajaxEvents.error.call(this, {jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown}, cfgs.form);
                  else
                    console.log('ReadySatate: '+jqXHR.readySatet+', ResponseText: '+jqXHR.responseText+', Status: '+jqXHR.status+', StatusText: '+jqXHR.statusText);
                },
                success: function(data, textStatus, jqXHR) {
                  // this == ajax
                  if(cfgs.ajaxAlertData==true) {
                    var alType = cfgs.alertType.split(';');
                    if(a.inArray('console', alType)>=0)
                      console(data);
                    if(a.inArray('alert', alType)>=0)
                      alert(data);
                    else if(a.inArray('uiDialog', alType)>=0 && privates.uiDialog.length>0)
                      methods.uiDialog(data);
                  }
                  if(cfgs.ajaxEvents.success!==null && typeof cfgs.ajaxEvents.success=='function')
                    cfgs.ajaxEvents.success.call(this, {data: data, textStatus: textStatus, jqXHR: jqXHR}, cfgs.form);
                },
                complete: function(jqXHR, textStatus) {
                  // this == ajax
                  if(cfgs.ajaxEvents.complete!==null && typeof cfgs.ajaxEvents.complete=='function')
                    cfgs.ajaxEvents.complete.call(this, {jqXHR: jqXHR, textStatus: textStatus}, cfgs.form);
                }
              });
              methods.Gravar(false);
            } catch(e) {
              console.log(e.message);
              methods.Gravar(false);
            }
          },
          ext: function(p) {
            // Executa função beforeSubmit caso configurada
            if(methods.ValidateEvents('beforeSubmit')===false)
              return;
            methods.Ajax.init(p);
            // Executa função afterSubmit caso configurada
            if(methods.ValidateEvents('afterSubmit')===false)
              return;
          }
        },

        // Alterar Value do botão Gravar
        Gravar: function(v) {
          var sbm = privates.sbm, cnl = privates.cnl;
          sbm.is('input') ? sbm.val(v?cfgs.btnSubmitWait:cfgs.btnSubmitValue) : sbm.text(v?cfgs.btnSubmitWait:cfgs.btnSubmitValue);
          sbm[0].disabled=v;
          sbm.mouseleave();
          if(cnl.length>0&&cnl!=null)
            cnl[0].disabled=v;
        },

        // Adiciona evento para o Cancelar
        CancelOnEsc: function(e) {
          var e=e||window.event, kp=e.which||null;
          if(kp==27)
            methods.Cancel(true);
        },

        Cancel: function(onEsc) {
          var alert = ((!onEsc && cfgs.cancelAlertEsc[0])||(onEsc && cfgs.cancelAlertEsc[1])) ? confirm('Deseja Cancelar a operação?'):true;
          if(typeof cfgs.cancelFunction=='function' && alert)
            cfgs.cancelFunction.call(cfgs.form);
          if(cfgs.cancelFunction=='BackPage' && alert)
            window.history.back();
          if(cfgs.cancelFunction=='WindowClose' && alert)
            window.close();
        },

        // Valida Email
        isEmail: function(n, s, m) {
          b = /^(\w|\d|[\-_=])+(\.(\w|\d|[\-_=])+)*@(\w|\d|[\-_=]){2,}(\.(\w|\d|[\-_=]){2,})+$/i.test(s);
          return b||m||'O endereço digitado em '+n+' é  inválido!!!';
        },

        ValidateTypes: function(e, v, t) {
          try {
            var test, type;
            switch(t) {
              case 'number':   test=/^[+-]?[0-9]+([.,][0-9]+(e[+-]?[0-9]+)*)*$/g.test(v); type='Números'; break;
              case 'alnum':    test=/^[0-9a-zA-Z\s]+$/g.test(v); type='Alfanumérico'; break;
              case 'word':     test=/^[\w\s]+$/g.test(v); type='Word'; break;
              case 'wordplus': test=/^[\wÀ-ý\s]+$/g.test(v); type='Word Plus'; break;
              case 'wordext':  test=/^[!-~À-ý\s]+$/g.test(v); type='Word Plus Extendido'; break;
              case 'digit':    test=/^\d+$/g.test(v); type='Digitos'; break;
              case 'integer':  if(typeof v=='string') v=a.trim(v); test=(v!=='' && !isNaN(v) && parseInt(Number(v)) == v); type='Inteiro'; break;
              case 'decimal':  if(typeof v=='string') v=a.trim(v); test=(v!=='' && !isNaN(v) && parseFloat(Number(v)) == v); type='Decimal'; break;
              default: console.log('Tipo definido '+t+' não existe. Elemento: '+e+'.'); test=false; break;
            }
            return [test, type];
          } catch(e) {
            console.log(e.message);
            return [false,null];
          }
        },

        // Executa um evento de validação customizado
        ValidateEvents: function(method) {
          var func=null;
          switch(method) {
            case 'beforeValidate': func = cfgs.validateEvents.beforeValidate; break;
            case 'afterValidate': func = cfgs.validateEvents.afterValidate; break;
            case 'beforeSubmit': func = cfgs.validateEvents.beforeSubmit; break;
            case 'afterSubmit': func = cfgs.validateEvents.afterSubmit; break;
          }
          if(func!==null && typeof func==='function')
            return func.call(cfgs, cfgs.form[0]);
          return null;
        },

        /*
         * Valida os dados do formulario
         * Params: 
         *  justCheck = Apenas verifacação dos campos sem chamar o submit ou ajax;
         *  e = Filtro para validar apenas o Elemento especificado
        */
        Validacao: function(justCheck, e) {
          try {
            // Quando valid for verdadeiro faz só validação dos campos sem executar outros itens
            if(!justCheck) {
              // Troca valor do campos caso configurado type
              if(cfgs.changeFieldValues!==null && typeof cfgs.changeFieldValues==='object')
                for(j in cfgs.changeFieldValues)
                  cfgs.form[0][j].value=cfgs.changeFieldValues[j];
              // Executa função beforeValidate caso configurada
              if(methods.ValidateEvents('beforeValidate')===false)
                return;
              // type File and fields without name no fill this object with serialize. For this, use FormData.
              var params = cfgs.useFormData ? new FormData(cfgs.form[0]) : cfgs.form.serialize();
              //methods.Gravar(true);
            }
            var go=true, name, req, min, max, email, msg, msgMail, msgLen, target, condition, type, regCheckItem=/radio|checkbox/i, regEscapeCSSNotation=/(:|\.|\[|\])/g;
            // Cria objeto que armazena os erros
            privates.errors={};
            // Defini CountErrors
            privates.countErrors=0;
            for(var item in cfgs.fields) {
              // Se justCheck true e o elemento (e) foi definido, verifica apenas o elemento pulando o for para o próximo item até achar o elemento definido
              if(e && item!=e)
                continue;
              // Defini váriaveis item, elemento do form //
              var oItem=cfgs.fields[item], ae=a(cfgs.form[0]).find(cfgs.formFind+'[name='+item.replace(regEscapeCSSNotation, '\\$1')+']'), aeType=ae.attr('type'), itemNotChecked=regCheckItem.test(aeType)&&!ae.is(':checked'), value=a.trim(regCheckItem.test(aeType)?ae.filter(':checked').val():ae.val());
              // Verifica se elemento existe e foi achado
              if(ae.length>0&&ae!=null) {
                // Defini váriaveis de verificação do elemento
                privates.errors[item]='', name=oItem.name||item, req=oItem.req||false, min=oItem.minlen||0, max=oItem.maxlen||0, email=oItem.email||false, msg=oItem.msg||null, msgMail=(email)?methods.isEmail(name,value,oItem.msgMail):null, msgLen=oItem.msglen||false, target=oItem.target||false, condition=oItem.condition||false, type=oItem.type?methods.ValidateTypes(item, oItem.type, value):false;
                // Verifica regras dos campos e gera mensagens de erros

                // Campos podem ou não ser verificados dependo do valor de uma pré condição!!! Caso a condição retorne false, o elemento não será verificado!
                // Os parametros disponíveis são "this" com as configurações do plugin, o form, o elemento atual.
                // Pode ser usado uma mesma condição pra todos os campos, usando o parametro condition com valor true para o campo e fazendo a codição no parametro condition da raiz configs;
                // Pode criar condições diferentes como métodos no parametro condition da raiz configs, e passar o nome do método no parametro condition de cada campo;
                // Pode ser usado uma função diretamente no parametro condition para determinado campo;
                if(condition) {
                  if(condition===true) {
                    if(typeof cfgs.condition!=='function')
                      throw { message: 'Parâmetro condition não criado ou não é uma função!'};
                    else if(!cfgs.condition.call(cfgs, cfgs.form[0], ae))
                      continue;
                  } else if(typeof condition=='string') {
                    if(!cfgs.condition)
                      throw { message: 'Parâmetro condition não criado!!!'};
                    else if(!cfgs.condition[condition] || (cfgs.condition[condition] && typeof cfgs.condition[condition]!=='function'))
                      throw { message: 'Parâmetro condition não contém a propriedade "'+condition+'" ou esta não é uma função!'};
                    else if(!cfgs.condition[condition].call(cfgs, cfgs.form[0], ae))
                      continue;
                  } else if(typeof condition=='function') {
                    if(!condition.call(cfgs, cfgs.form[0], ae))
                      continue;
                  }
                }

                if(req && (value==''||itemNotChecked))
                  privates.errors[item] = msg||'O campo "'+name+'" é obrigatório!!!';
                if(min>0 && value.length<min)
                  privates.errors[item] += msgLen||'\nO campo "'+name+'" deve ter no mínimo "'+min+'" caracteres!!!';
                if(max>0 && value.length>max)
                  privates.errors[item] += msgLen||'\nO campo "'+name+'" deve ter no máximo "'+max+'" caracteres!!!';
                if(value!='' && email && msgMail!==true)
                  privates.errors[item] += '\n'+msgMail;
                if(typeof type=='array' && type[0]===false)
                  privates.errors[item] =+ 'O campo "'+name+'" não é do tipo "'+type[1]+'"!!!';
                // Se há erros, exibe-os e sai da função
                if(privates.errors[item]) {
                  privates.countErrors++;
                  // Exibindo erros
                  if(cfgs.showError && !justCheck) {
                    var alType = cfgs.alertType.split(';');
                    if(a.inArray('console', alType)>=0)
                      console.log('Ocorreu um erro: "'+privates.errors[item]+'".');
                    if(a.inArray('alert', alType)>=0) {
                      alert(privates.errors[item]);
                      return false;
                    } else if(a.inArray('uiDialog', alType)>=0 && privates.uiDialog.length>0) {
                      methods.uiDialog(privates.errors[item].replace('\n', '<br/>'));
                      return false;
                    }
                  }
                  if(aeType!='hidden')
                    ae.focus();
                  else if(oItem.target)
                    a(cfgs.form[0]).find(cfgs.formFind+'[name='+oItem.target.replace(regEscapeCSSNotation, '\\$1')+']').focus();
                  go=false;
                }
              }
            };
            // Just Check
            if(justCheck)
              return privates.countErrors==0;
            // Executa função afterValidate caso configurada
            if(methods.ValidateEvents('afterValidate')===false)
              return;
            // Se houver algum erro não avança
            if(privates.countErrors>0)
              return false;
            // Se não houve erros, executa o submit do form ou a chamada do ajax
            if(go){
              // Executa função beforeSubmit caso configurada
              if(methods.ValidateEvents('beforeSubmit')===false)
                return;
              if(cfgs.useAjax)
                methods.Ajax.init(params);
              else {
                cfgs.form[0].target=cfgs.target;
                cfgs.form[0].action=cfgs.action;
                cfgs.form[0].enctype=cfgs.enctype;
                cfgs.form[0].method=cfgs.method;
                cfgs.form[0].submit();
                // Executa função afterSubmit caso configurada
                if(methods.ValidateEvents('afterSubmit')===false)
                  return;
              }
            }
          } catch(e) {
            console.log(e.message);
          }
        },

        // Prepara os principais eventos
        setEvents: function() {
        // Atribui elementos as váriaveis
          var sbm = privates.sbm, cnl = privates.cnl;
          // Previni o Submit padrão ser executado
          a(cfgs.form).on('submit', function(e) { e.preventDefault(); });
          if(sbm.length==0) {
            var frm = cfgs.form[0].attributes.id.value||cfgs.form[0].name||null;
            throw { message: 'Botão Submit não encontrado'+(frm?' para o fomulário '+frm:null)+'. Certifique-se que ele faz parte do formulário!'};
          }
          if(cfgs.btnCancel!=defaults.btnCancel&& cnl.length==0)
            console.log("Botão Cancel não encontrado.");
          // Adiciona evento de validação no botão Gravar
          sbm.on('click.psfValidate', function(e){ 
            e.preventDefault(); methods.Validacao(); 
            if (cfgs.clearOnFinish===true) 
              methods.clearOnFinish(); 
            a(this).mouseleave();
          });
          // Altera value do botão Submit se foi passado por parametro ou se vazio para valor padrão
          cfgs.btnSubmitValue = cfgs.btnSubmitValue||a.trim(sbm.is('input')?sbm.val():sbm.text())||cfgs.btnSubmitValueDefault;
          sbm.is('input') ? sbm.val(cfgs.btnSubmitValue) : sbm.text(cfgs.btnSubmitValue);
          // Verifica se existe botão btnCancel
          if(cnl.length>0&&cnl!=null) {
            // Altera value do botão Submit se foi passado por parametro ou se vazio para valor padrão
            if(cnl.val().length==0 || cfgs.btnCancelValue)
              cnl.val(cfgs.btnCancelValue||cfgs.btnCancelValueDefault);
            cnl.on('click.psfValidate', methods.Cancel);
          }
          if(cfgs.cancelOnEsc)
            a(document).on('keydown.psfValidate', methods.CancelOnEsc);

          // Cria div para guardar evento uiDialog
          if(a.inArray('uiDialog', cfgs.alertType.split(';'))>=0) {
            try {
              if(typeof a.fn.dialog!=='function' || !('dialog' in a.fn))
                throw { message: 'O Plugin jQueryUI Dialog, não foi instanciado!!!' };
              privates.uiDialog = a('<div />');
              privates.uiDialog.attr({'id': 'psfValidate_uiDialog', 'title': 'Alerta'}).css({display: 'none', 'text-align': 'justify'}).appendTo('body');
              privates.uiDialog.dialog({
                modal: true,
                draggable: false,
                resizable: false,
                autoOpen: false,
                width: 'auto',
                maxWidth: a(document).width()/2,
                buttons: { 'Fechar': function(){ a(this).dialog('close'); } }
              });
              privates.uiDialog.parent('div').css('max-width', a(document).width()/2);
            } catch(e) {
              if(privates.uiDialog.length>0)
                privates.uiDialog.remove();
              console.log('Um erro ocorreu ao tentar criar o Alerta com uiDialog: "'+e.message+'".');
            }
          }
        },

        // Remove eventos dos botões Submit e Cancel
        destroyEvents: function() {
          a(cfgs.btnSubmit).off('click.psfValidate');
          a(cfgs.btnCancel).off('click.psfValidate');
          a(document).off('keydown.psfValidate');
        },

        uiDialog: function(data) {
          if(privates.uiDialog.length==0) {
            console.log('Ocorreu um erro com o uiDialog: "Elemento não encontrado!".');
            return false;
          }
          privates.uiDialog.html(data);
          privates.uiDialog.dialog('open');
        },

        clearFields: function() {
          var fType, fTagName, elements=cfgs.form[0].elements;
          for(i=0; i<elements.length ;i++) {
            fType = elements[i].type.toLowerCase();
            fTagName = elements[i].tagName.toLowerCase();

            if (fTagName=='input' || fTagName=='textarea' || fTagName=='select') {
              try {
                switch(fType) {

                  case 'radio': case 'checkbox':
                    if (elements[i].checked)
                      elements[i].checked = false;
                    break;
                  case 'select-one': case 'select-multi':
                    elements[i].selectedIndex = -1;
                    break;
                  case 'textarea':
                    elements[i].text='';
                    break;
                  default:
                    elements[i].value='';
                    break;
                }
              } catch (e) {
                console.log(e.message);
              }
            }
          }
        }

      };

      // Exibe os erros capturados pelo método Valid
      tValidate.GetErrors = function(){
        return { 'allErrors': privates.errors!=undefined&&privates.errors||'Não há erros!!!', 'countErrors': privates.countErrors||0 };
      },

      // Faz uma pré verificação do formulário resultando se está ou não válido
      tValidate.Valid = function(e) {
        try {
          if(e) {
            if(e in cfgs.fields)
              return methods.Validacao(true, e);
            else
              throw { message: 'O elemento requisitado "'+e+'" não foi incluído nas regras de verificação!!!' };
          } else
            return methods.Validacao(true);
        } catch(e) {
          console.log(e.message);
          return false;
        }
      },

      // Adiciona campos para regras de verificação
      tValidate.AddFields = function(fieldObj, rules) {
        if(fieldObj!=undefined) {
          if(typeof fieldObj == 'object' && rules==undefined)
            cfgs.fields = a.extend({}, cfgs.fields, fieldObj);
          else if(typeof fieldObj == 'string' && rules != undefined && typeof rules == 'object')
            cfgs.fields[fieldObj] = rules;
          else
            console.log('Não foi possível adicionar novas regras. Erro na passagem de parâmetros!');
        }
      },

      // Chamada para limpeza dos campos a qualquer momento
      tValidate.ClearFields = function() {
        methods.clearFields();
      },

      // Basta usar $(element).data('psfValidate').remove();
      tValidate.remove = function() {
        methods.destroyEvents();
        delete(tValidate);
      };

      // inicializa a função;
      if(e) {
        this.configuration.form = a(e);
        tValidate.init();
      } else {
        return methods.Ajax.ext(p);
      }

    };

    a.fn[pluginName] = function(o) {
      try {
        if(a(this).length<=0)
          throw { message: 'O elemento "'+(this.selector||'form')+'" não existe!!!' };
        return this.each(function(){
          if(!a(this).data('psfValidate')) {
            a(this).data('psfValidate', new Validate(o, this));
          }
        });
      } catch(e) { console.log(e.message); }
    };

    a[extensionAjax] = function() {
      try {
        if(arguments.length!=2)
          throw { message: 'Este comando necessita dois parametros!!!' };
        new Validate(arguments[1], null, arguments[0]);
      } catch(e) { console.log(e.message); }
    };

  });
})(jQuery, window, document);

;(function(a, window, document, undefined){
  a(function(){
    var pluginName='psfMaxLength';
    a.fn[pluginName]=function(v){
      return this.each(function(){
        var t=a(this);
        t.keyup(function(){
          var m=parseInt(v)||parseInt(t.attr('maxlength'));
          if(t.val().length>m)
            t.val(t.val().substr(0,m));
        });
        t.bind('paste', function(e){
          setTimeout(function(){ t.trigger('keyup'); }, 0);
        });
      });
    }
  })
})(jQuery, window, document);