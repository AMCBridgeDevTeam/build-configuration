var type;
var scroll = 0;
var isAdmin;
var projectNumber = 0;
var configurator = (function () {
    var initPage = function () {

        var parameters = document.location.search.substr(1);
        if (parameters.length != 0) {
            var projectName = getParameterValue("name");
            type = getParameterValue("type");
            jQuery("#formType").val(type.toUpperCase());
            loadViews(projectName);
            loadUsers(projectName);
            setContent(projectName);
            var projectNameTextBox = jQuery("#projectName");
            projectNameTextBox.prop('disabled', true);
            projectNameTextBox.attr('onchange', null);
            projectNameTextBox.attr('onblur', null);
            initCommentCheckbox(true);

            if (type == "ApproveReject") {
                jQuery("#titlePage").html("Approve/reject build configuration");
                jQuery('#save').val("Approve");
                jQuery('#reject').show();
            }
            if (type == "view") {
                jQuery('#save').hide();
                jQuery('#spanReject').show();
            }

        }
        else {
            buildConfiguration.loadCreateNewBuildConfiguration(function (t) {
                if (jQuery("#formType").val() == "CREATE") {
                    addView();
                }
            });
            jQuery("#formType").val('CREATE');
            projectNumber = 0;
            initCommentCheckbox(false);
            jQuery('#pollSCMTrigger').val('H * * * *');
        }

        buildConfiguration.isCurrentUserAdministrator(function (t) {
            isAdmin = t.responseObject();
        });

        jQuery("#cancelButton").click(function () {
            location.href = './';
        })
    };

// TODO: ADD TO HIDDEN FUNCTION FOR BMC!!!
    function setContent(name) // used in initPage only
    {
        buildConfiguration.getConfiguration(name, function (t) {
            jQuery("#projectName").val(t.responseObject().projectName);
            jQuery("#typeSCM").val(t.responseObject().scm);
            jQuery("#preScript").val(t.responseObject().preScript);
            jQuery("#postScript").val(t.responseObject().postScript);
            jQuery("#comments").val(t.responseObject().comments);
            jQuery("#regExp").val(t.responseObject().regExp);
            jQuery("#pollSCMTrigger").val(t.responseObject().pollSCMTrigger);
            jQuery("#buildPeriodicallyTrigger").val(t.responseObject().buildPeriodicallyTrigger);

            setScriptTypeSelect(t.responseObject().scriptType);
            var usersList = t.responseObject().usersList; 
            var isNewConfiguration = false;
     
            if (t.responseObject().rejectionReason != "")
                jQuery("#reasonLabel").html("Reason of rejection:  " + t.responseObject().rejectionReason);

            var bmcValue = t.responseObject().buildMachineConfiguration;
            var build_machine_configuration = jQuery("#build_machine_configuration");
            if (build_machine_configuration != null) {
                build_machine_configuration.val("");
                var bmc = document.getElementsByName("node");
                for (var i = 0; i < bmc.length; i++) {
                    jQuery("#" + bmc[i].id).prop('checked', false);
                }
            }

            Object.keys(bmcValue).forEach(function (key) {
                if (bmcValue[key]) {
                    document.getElementById(key).checked = true;
                    var isBelongToProject = false;
                    addToHidden("build_machine_configuration", key, null, isBelongToProject);
                }
            });

            var mail = t.responseObject().email;
            if (mail.length != 0) {
                var email = jQuery("#email");
                email.prop('disabled', false);
                email.val(mail);
                jQuery('#isEmail').prop('checked', true);
            }
            jQuery("#configEmail").val(t.responseObject().configEmail);

            var cleanWorkspace = t.responseObject().cleanWorkspace;
            if(cleanWorkspace != null &&  cleanWorkspace == false){
                jQuery("#cleanWorkspace").prop('checked', false);
            }
            var buildOnCommitTriggerValue = t.responseObject().buildOnCommitTrigger;

            if (buildOnCommitTrigger == null || buildOnCommitTriggerValue) {
                jQuery('#buildOnCommitTrigger').prop('checked', true);
            }
            else {
                jQuery('#buildOnCommitTrigger').prop('checked', false);
            }

            if (t.responseObject().creator != null) {
                buildConfiguration.getFullNameCreator(t.responseObject().creator, function (t) {
                    jQuery("#userLabel").html("Created by:  " + t.responseObject());
                })
            }
           
            if(t.responseObject().state != 'APPROVED'){
                setDiffContent(name,t);
            }
        })
    }

    function setDiffContent(name, currentConfig){
        buildConfiguration.getDiffConfiguration(name, function (t) {
            jQuery("#preScript_old").prop('disabled', true);
            jQuery("#postScript_old").prop('disabled', true);
            jQuery("#pollSCMTrigger_old").prop('disabled', true);
            jQuery("#buildPeriodicallyTrigger_old").prop('disabled', true);
            if (t.responseObject() == null || t.responseObject().projectName == ""){
                return;
            }
            var projectName = t.responseObject().projectName;
            var scm = t.responseObject().scm;
            var preScript = t.responseObject().preScript;
            var postScript = t.responseObject().postScript;
            var email = t.responseObject().email;
            var configEmail = t.responseObject().configEmail;
            var cleanWorkspace = t.responseObject().cleanWorkspace;
            var regExp = t.responseObject().regExp;
            var pollSCMTrigger = t.responseObject().pollSCMTrigger;
            var buildPeriodicallyTrigger = t.responseObject().buildPeriodicallyTrigger;
            var buildOnCommitTrigger = t.responseObject().buildOnCommitTrigger;
            var buildMachineConfiguration = t.responseObject().buildMachineConfiguration;

            Object.keys(buildMachineConfiguration).forEach(function (key) {
                if (buildMachineConfiguration[key] != currentConfig.responseObject().buildMachineConfiguration[key]) {
                    jQuery("#label_" + key).css("color", "brown");
                }
            });

            if(scm != null && scm != currentConfig.responseObject().scm){
                jQuery("#typeSCM_old").text('\"' + scm + '\"');
                jQuery("#typeSCM_old").removeClass('display-none');
            }
            
            if(email != null &&  email != currentConfig.responseObject().email){
                jQuery("#isEmail_old").text('\"' + email + '\"');
                jQuery("#isEmail_old").removeClass('display-none');
            }

            if(configEmail != null && configEmail != currentConfig.responseObject().configEmail){
                jQuery("#configEmail_old").text('\"' + configEmail + '\"');
                jQuery("#configEmail_old").removeClass('display-none');
            }

            if(preScript != null && preScript != currentConfig.responseObject().preScript){
                jQuery("#preScript_old").text(preScript);
                jQuery("#preScript_old").removeClass('display-none');
            }
            if(postScript != null && postScript != currentConfig.responseObject().postScript){
                jQuery("#postScript_old").text(postScript);
                jQuery("#postScript_old").removeClass('display-none');
            }
            if(regExp != null && regExp != currentConfig.responseObject().regExp){
                jQuery('#regExp_old').text('\"' + regExp + '\"');
                jQuery('#regExp_old').removeClass('display-none');
            }
            if(cleanWorkspace  && cleanWorkspace != currentConfig.responseObject().cleanWorkspace){
                if(cleanWorkspace==true){
                    jQuery('#cleanWorkspace_old').text('checked');
                }
                else{
                    jQuery('#cleanWorkspace_old').text('unchecked');
                }
                jQuery('#cleanWorkspace_old').removeClass('display-none');
            }
            if(buildOnCommitTrigger != null && buildOnCommitTrigger != currentConfig.responseObject().buildOnCommitTrigger){
                if(buildOnCommitTrigger==true){
                    jQuery('#buildOnCommitTrigger_old').text('checked');
                    }
                else{
                    jQuery('#buildOnCommitTrigger_old').text('unchecked');
                    }
                jQuery('#buildOnCommitTrigger_old').removeClass('display-none');
            }
            if(pollSCMTrigger != null && pollSCMTrigger != currentConfig.responseObject().pollSCMTrigger){
                jQuery("#pollSCMTrigger_old").text(pollSCMTrigger);
                jQuery("#pollSCMTrigger_old").removeClass('display-none');
            }
            if(buildPeriodicallyTrigger != null && buildPeriodicallyTrigger != currentConfig.responseObject().buildPeriodicallyTrigger){
                jQuery("#buildPeriodicallyTrigger_old").text(buildPeriodicallyTrigger);
                jQuery("#buildPeriodicallyTrigger_old").removeClass('display-none');
            }
        })
    }


    function getParameterValue(parameter) {
        var params = decodeURIComponent(document.location.search.substr(1));
        params = params.replace(/%20/g, " ");
        params = params.split('&');
        if (params.length == 0)
            return;
        var paramValue = params[0];
        if (paramValue.indexOf(parameter) != -1) {
            return paramValue.split('=')[1];
        }
        paramValue = params[1];
        if (paramValue.indexOf(parameter) != -1) {
            return paramValue.split('=')[1];
        }
    }

    var  getElementNumber = function (id) {
        return id.substring(id.lastIndexOf('_') + 1);
    }

    var getProjectId = function (element) {
        return "#" + jQuery(element).closest("div[name=projectToBuild]").attr("id");
    }

    function clearSelectionGroup(selectedElement) {
        for (var option in selectedElement) {
            selectedElement.remove(option);
        }
    }

    var addView = function () {
        jQuery("#label-add-view").hide();
        buildConfiguration.getView(
            function (t) {
                var iDiv = document.createElement("div");
                iDiv.innerHTML = t.responseObject().html;
                jQuery("#projectsToBuild").append(iDiv);
                var projectId = "#" + iDiv.firstElementChild.id;

                var scm = jQuery("#typeSCM")[0];
                var scmValue = scm.options[scm.selectedIndex].value;

                var defaultLocalPath;
                switch (scmValue) {
                    case 'Git':
                        defaultLocalPath = ".";
                        break;
                    case 'Subversion':
                        defaultLocalPath = "Development";
                        break;
                    default:
                        defaultLocalPath = "";
                        break;
                }
                setLocalFolderPath(defaultLocalPath, projectId);
                addBuilder(projectId);
                setDefaultCredentials(projectId)
                projectNumber++;
            });
    }
    function setDefaultCredentials(projectId){
        var cred_select = jQuery(projectId).find("[name = credentials]")[0];
        var default_cred_value = jQuery("#def_cred").val();
        for (var i = 0; i < cred_select.options.length; i++) {
            if (cred_select.options[i].value === default_cred_value) {
                cred_select.selectedIndex = i;
                cred_select.options[i].selected = 'selected';
                break;
            }
        }

    }

    function setLocalFolderPath(defaultLocalPath, projectId) {
        defaultLocalPath = defaultLocalPath + ((projectNumber > 0) ? projectNumber : "");
        jQuery(projectId).find("[name=localDirectoryPath]").val(defaultLocalPath);
    }

    function setScriptTypeSelect(scriptTypeSelected) {

        var script_select = jQuery("#scriptTypeSelect")[0];
        for (var i = 0; i < script_select.options.length; i++) {
            if (script_select.options[i].value === scriptTypeSelected) {
                script_select.selectedIndex = i;
                script_select.options[i].selected = 'selected';
                break;
            }
        }

    }

    var setCurrentCredentialsAsDefault = function (element) {
        var projectId = getProjectId(element);
        var credentials_select = jQuery(projectId).find("[name=credentials]")[0];
        var def_cred_value = credentials_select.options[credentials_select.selectedIndex].value;
        jQuery("#def_cred").val(def_cred_value);
    }


    var loadViews = function (projectName) {
        buildConfiguration.loadViews(projectName,
            function (t) {
                if (t.responseObject().html.length != 0) {
                    var iDiv = document.createElement("div");
                    iDiv.innerHTML = t.responseObject().html;
                    document.getElementById("projectsToBuild").appendChild(iDiv);
                    projectNumber = iDiv.childNodes.length;
                    /*loadDeletedViews(projectName);*/
                }
                
                return;
            });
    }

        var loadDeletedViews = function (projectName) {
        buildConfiguration.loadDeletedViews(projectName,
            function (t) {
                if (t.responseObject().html.length == 0) {
                    return;
                }
                var iDiv = document.createElement("div");
                iDiv.innerHTML = t.responseObject().html;
                document.getElementById("projectsToBuildDeleted").appendChild(iDiv);
                projectNumber = iDiv.childNodes.length;
                return;
            });
    }

    var loadUsers = function (projectName){

        buildConfiguration.loadUserAccessView(projectName,
            function (t) {
                if (t.responseObject().html.length == 0) {
                    return;
                }
                var iDiv = document.createElement("div");
                iDiv.innerHTML = t.responseObject().html;
                jQuery("#usersList").append(iDiv); 
            });

    }

    var addBuilder = function (projectId) {
    
        buildConfiguration.getBuilderView(
            function (t) {
                var iDiv = document.createElement("div");
                iDiv.innerHTML = t.responseObject().html;
                jQuery(projectId).find("[class=builders]").append(iDiv);
            });
    }


    var addNewUserAccess = function() {

        var addUserField = jQuery("#addUserField");
        var uName = addUserField.val();
        if(uName.length>0)
        {
            addUserAccess(uName);
            addUserField.val("");
        }
    }
    var addUserAccess = function(uName) {
        buildConfiguration.getUserAccessView(
            function (t) {
               var iDiv = document.createElement("div");
               jQuery(iDiv).addClass('userDiv');
                iDiv.innerHTML = t.responseObject().html;
                jQuery(iDiv).find("[name=userName]").val(uName);
                jQuery("#usersList").append(iDiv); 
            
        });
    }


    var deleteFromSelect = function (selectionBox, event) {
        if (event.which == 46){
        var valueToDelete = jQuery(selectionBox).find('option:selected').val();
        var hiddenFieldName;
         jQuery(selectionBox).find('option:selected').remove();

           switch (selectionBox.name) {
                     case 'artifacts_group':
                         hiddenFieldName = "artifacts";
                         break;
                     case 'vFiles':
                         hiddenFieldName = "versionFiles";
                         break;
                     default:
                         break;
                 }
         var projectId = getProjectId(selectionBox);
         var project = jQuery(projectId);
         var hiddenField = project.find("[name="+hiddenFieldName+"]")[0];
             deleteFromHidden(hiddenField, valueToDelete);


        }
    }

    var emailCheckBoxChange = function (checkBox) {
        var email = jQuery("#email");
        if (!checkBox.checked) {
            jQuery("#email_Error").addClass('display-none');
            email.removeClass('wrong');
            email.prop("disabled", true);
            email.val("");
        }
        else {
            email.prop("disabled", false);
        }
    }

    function disableOtherConfig(checkBox) {
        var builder = jQuery(checkBox).closest("div[name=builders]");
        if (!checkBox.checked) {
            builder.find("[name=userConfig]").addClass('hidden');
            builder.find("[name=userConfig]").val("");
        }
        else {
            builder.find("[name=userConfig]").removeClass('hidden');
        }
    }


    function addToSelectionBox(selectionBox, path) {
        if (selectionBox.length != 0) {
            if (selectionBox[0].value == "")
                selectionBox.remove(0);
        }

        var option = document.createElement("option");
        option.text = path;
        option.value = path;
        selectionBox.add(option);

        var hiddenInputName;
        if (selectionBox.name == "artifacts_group"){
            hiddenInputName="artifacts";
        }
        else if(selectionBox.name == "vFiles"){
            hiddenInputName="versionFiles";
        }
        var isBelongToProject = true;
        addToHidden(hiddenInputName, path, selectionBox, isBelongToProject);
    }


    function addToHidden(hiddenInputName, value, element, isBelongToProject) {
        var projectId = getProjectId(element);
        var project = jQuery(projectId);
        var hiddenValue;

        var hiddenField; 
        if (isBelongToProject){
            hiddenField = project.find("[name=" + hiddenInputName +"][type=hidden]");
        }
        else {
            hiddenField = jQuery("[name=" + hiddenInputName +"][type=hidden]");   
        }

        hiddenValue = hiddenField.val();

        if (hiddenValue.length > 0 && hiddenValue.lastIndexOf(";") != hiddenValue.length - 1) {
            hiddenField.val(hiddenValue + ";" + value + ";");
        }
        else {
            hiddenField.val(hiddenValue + value + ";");
        }
    }

    var versionFileCheckBoxChange = function (checkBox) {
        var projectId = getProjectId(checkBox);
        var project = jQuery(projectId); 
        var versionFilesPath = project.find("[name=versionFilesPath]");
        if (checkBox.checked) {
            versionFilesPath.removeClass('hidden');
            versionFilesPath.val("");
            project.find("[name=versionFiles]").val("");
            project.find("[name=addVersion]").css("visibility", "visible");
            project.find("[name=vFiles]").css("visibility", "visible");
            project.find("[dir=fieldSetDiv]").removeClass('display-none');
        }

        if (!checkBox.checked) {
            jQuery(projectId).find("[name=versionFiles]").val("");

            var selectionElement = jQuery(projectId).find("[name=vFiles]")[0];
            clearSelectionGroup(selectionElement);
            versionFilesPath.addClass('hidden');
            project.find("[name=addVersion]").css("visibility", "hidden");
            project.find("[name=vFiles]").css("visibility", "hidden");
            project.find("[dir=fieldSetDiv]").addClass('display-none');
        }
    }

    var isValidForm = function () {
        var projectName = jQuery("#projectName")[0];
        var pathFolder = jQuery("[name=localDirectoryPath]");
        var pathUrl = jQuery("[name=projectUrl]");
        var pathArt = jQuery("[name=pathToArtifacts]");
        var pathVer = jQuery("[name=versionFilesPath]");
        var build = jQuery("[name=projectToBuild]");
        var patBuild = jQuery("[name=fileToBuild]");
        var userConfig = jQuery("[name=userConfig]");
        if (!isProjectNameValid()) {
            projectName.focus();
            return false;
        }
        if (projectName.className == "textbox wrong") {
            projectName.focus();
            return false;
        }
        if (build.length == 0) {
            jQuery("#label-add-view").show();
            return false;
        }
        if (jQuery("#email_Error").attr("class") == "error-block") {
            jQuery("#email").focus();
            return false;
        }
        if (jQuery("#configEmail_Error").attr("class") == "error-block") {
            jQuery("#configEmail").focus();
            return false;
        }
        if(jQuery('#pollSCMTriggerMessage').text().includes('ERROR')){
            jQuery('#pollSCMTrigger').focus();
            return false;
        }
        if(jQuery('#buildPeriodicallyTriggerMessage').text().includes('ERROR')){
            jQuery('#buildPeriodicallyTrigger').focus();
            return false;
        }

        validAllView();
        if (!checkingPath(pathUrl))
            return false;
        if (!checkingPath(pathFolder))
            return false;
        if (!checkingPath(pathArt))
            return false;
        if (!checkingPath(pathVer))
            return false;
        if (!checkingPath(patBuild))
            return false;
        if (!checkingPath(userConfig))
            return false;
        if (type == "edit")
            return true;
        if (type == "ApproveReject") {
            jQuery("#formType").val("APPROVED");
            return true;
        }
        buildConfiguration.isNameFree(projectName.value, function (t) {
            if (t.responseObject() != false) {
                jQuery("#fieldHelp").addClass('display-none');
                document.getElementById("save").onclick = null;
                setFormResultDialog("create");
                document.getElementById('save').click();
            }
            else {
                jQuery("#fieldHelp").html("Configuration with name '" + projectName.value + "' already exists. Please use another name.");
                jQuery("#fieldHelp").removeClass('display-none');

            }
        });
        return false;
    }

    function checkingPath(path) {
        if (path.length == 0)
            return true;
        for (var i = 0; i < path.length; i++) {
            if (path[i].className == "textbox wrong" || path[i].className == "wrong") {
                path[i].focus();
                return false;
            }
        }
        return true;
    }

    var rejectDiv = function () {
        jQuery("#rejectDiv").removeClass('display-none');
        jQuery("#overlay").removeClass('display-none');
        jQuery("#textReject").focus();
    }

    var rejectionSubmit = function ()
    {
        return true;
    }

   var deleteFromHidden  = function (hidden, value) {
        hidden.value = hidden.value.replace(value, "");
        hidden.value = hidden.value.replace(";;", ";");
        if (hidden.value[0] == ";") {
            hidden.value = hidden.value.substr(1, hidden.value.length);
        }
        if (hidden.value.lastIndexOf(";") == hidden.value.length - 1) {
            hidden.value = hidden.value.substr(0, hidden.value.length - 1);
        }
    }

    var setFormResultDialog = function (result) {
        jQuery("#formResultHidden").val(result);
    }

    var closeElement = function (closeElement) {
        var divToDeleteName;
        var divToDelete;
        var element = jQuery(closeElement);
        if (element.attr("name") == "closeProject") {
            divToDeleteName = "projectToBuild";
        }
        else if (element.attr("name") == "closeBuilder") {
            divToDeleteName = "builders";
        }
        divToDelete = element.closest("div[name=" + divToDeleteName + "]");
        divToDelete.html("");
        divToDelete.remove();
    }

    var addArtifactPath = function (button) {
        var projectId = getProjectId(button);
        var project = jQuery(projectId); 
        var pathValue = project.find("[name=pathToArtifacts]").val();
        var error = project.find("[name=pathToArtifacts-block]").attr("class");
        var pathBlock = project.find("[name=pathToArtifacts-block]");

        if ((pathValue.length <= 0) || (error == "error-block")) {
            return;
        }
        var selectionBox = jQuery(projectId).find("[name=artifacts_group]")[0];

        if (!checkPathRepeat(pathValue, selectionBox)) {
            addToSelectionBox(selectionBox, pathValue);
            pathBlock.addClass('display-none');
            project.find("[name=pathToArtifacts]").val("");
        }
        else {
            pathBlock.removeClass('display-none');
            project.find("[error=artifact_error_exp]").html(" This path already exists");
            return;
        }
    }

    var addPathFiles = function (button) {
        var projectId = getProjectId(button);
        var project = jQuery(projectId);
        var path = project.find("[name=versionFilesPath]").val();
        var error = project.find("[name=versionFilesPath-block]").attr("class");

        if ((path.length <= 0) || (error == "error-block")) {
            return;
        }
        var selectionBox = project.find("[name=vFiles]")[0];

        if (!checkPathRepeat(path, selectionBox)) {
            addToSelectionBox(selectionBox, path);
            project.find("[name=versionFilesPath]").val("");
        }
        else {
            project.find("[error=v_files_error]").removeClass('display-none');
            project.find("[error=v_files_error_exp]").html(" This path already exists");
             }
    }

    function checkPathRepeat(path, selectionBox) {
        var options = selectionBox.options;
        if (options == null) {
            return false;
        }
        for (var i = 0; i < options.length; i++) {
            if (options[i].value == path) {
                return true;
            }
        }
        return false;
    }


    var fieldHelp = function (fieldImageHelpName) {
        var helpBlock = jQuery("#" + fieldImageHelpName + "-block");
        var help = jQuery("#" + fieldImageHelpName + "-text");    
        if (helpBlock.attr("class") == "help-view") {
            helpBlock.addClass('display-none');
            help.addClass('display-none');
        }
        else {

            helpBlock.removeClass('display-none');
            help.removeClass('display-none');
        }    
            
        }
        
    var imageHelp = function (element) {
        var projectId = getProjectId(element);
        var project = jQuery(projectId); 
        var helpBlock = project.find("[name="+element.name+"-block]"); 
        var help =  project.find("[name="+element.name+"-text]");
        if (helpBlock.attr("class") == "help-view") {

            helpBlock.addClass('display-none');
            help.addClass('display-none');
             }
        else {
            helpBlock.removeClass('display-none');
            help.removeClass('display-none');
        }
    }

    var validateMail = function (mail) {
        var name = mail.name;
        var mailValue = mail.value;
        var mails = mailValue.split(' ');
        var checking = true;
        var email = jQuery("#"+name); 
        for (var i = 0; i < mails.length; i++) {
            checking = checkMail(mails[i]);
            if (!checking)
                break;
        }
        if (checking || mail.value == "") {
            jQuery("#" + name + "_Error").addClass('display-none');
                email.removeClass('wrong');
        }
        else {
            jQuery("#" + name + "_Error").removeClass('display-none');
            email.addClass("wrong");
            }
    }

    function checkMail(mailp) {
        var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        if (pattern.test(mailp)) {
            return true;
        }
        return false;
    }

    var checkURL = function (element) {
        var regURL = /(((git|ssh|http(s)?)|(git@[\w\.]+))(:\/?)([\w\.\@:\/\-\~]+)(\.git)?)$/;
        var projectId = getProjectId(element);
        var project = jQuery(projectId);
        var urlValue = project.find("[name=projectUrl]").val();
        var urlBlock = project.find("[name=projectUrl-block]");
        var url =  project.find("[name=projectUrl]");

        if (regURL.test(urlValue)) {
            urlBlock.addClass('display-none');
            url.removeClass('wrong');
        }
        else {

            urlBlock.removeClass('display-none');
            url.addClass('wrong');
        }
    }


    var checkPTB = function (element) {
        var regPath = /^([a-zA-Z]:\\)?[^\x00-\x1F"<>\|:\*\?/]+\.[a-zA-Z]{3,5}$/i;
        var projectId = getProjectId(element);
        var project = jQuery(projectId);
        var fileBlock = project.find("[name=fileToBuild-block]");
        var file = project.find("[name=fileToBuild]");
        var path = jQuery(projectId).find("[name=fileToBuild]").val();
        if (regPath.test(path) || path.length==0) {

        fileBlock.addClass('display-none');
        file.removeClass('wrong');
        }
        else {
        fileBlock.removeClass('display-none');
        file.addClass('wrong');
        }
    }

    var checkPath = function (element) {
        var projectId = getProjectId(element);
        var project = jQuery(projectId);
        var pathValue = jQuery(projectId).find("[name="+element.name+"]").val();
        var regPath;
        var path =  project.find("[name="+element.name+"]");
        var pathBlock = project.find("[name="+ element.name +"-block]");

        switch (element.name) {
            case 'versionFilesPath':
                regPath = /^(?![*?])(?:[^\\/:"*?<>|\r\n]+?(?:\/?|\/\*{0,2})*?|\/\*\.\*$)*?$/;// Allow Ant wildcards valid folder/file structure only
                break;
            case 'localDirectoryPath':
                regPath = /(^\.[A-Za-z0-9]*$)|^(?:(?!\.)[^\\/:*?"<>|\r\n]+\/?)*$/;				// Match only one . or valid folder structure (zero-length - ok)
                break;

            case 'pathToArtifacts':
                regPath = /^(?![*?])(?:[^\\/:"*?<>|\r\n]+?(?:\/?|\/\*{0,2})*?|\/\*\.\*$)*?$/;// Allow Ant wildcards valid folder/file structure only
                break;

            default:
                regPath = /(.)*$/;
                break;
        }

        if (regPath.test(pathValue) || path == "") {
                 pathBlock.addClass('display-none');
            path.removeClass('wrong');
        }
        else {

            pathBlock.removeClass('display-none');
            path.addClass('wrong');
        }
    }



    var OkReject = function () {
        var reason = jQuery("#textReject").val();
        if (reason != null) {
            if (reason.length == 0) {
                jQuery("#textReject").focus();
                return false;
            }
            jQuery("#rejectionReason").val(reason);
            jQuery("#formType").val("REJECT");
            document.getElementById("rejectSubmit").click();
            rejectionSubmit();
        }
        return;
    }

    var CancelReject = function () {
        jQuery("#rejectDiv").addClass('display-none');
        jQuery("#overlay").addClass('display-none');
        jQuery("#textReject").val("");
    }

    var isProjectNameValid = function () {
        var regPath = /^([a-zA-Z0-9_-]+)$/;
        var projectError = jQuery("#projectError");
        var projectErrorText = jQuery("#projectErrorText");
        var projectName = jQuery("[name=projectName]");
        var projectNameValue = jQuery('#projectName').val();
        jQuery("#fieldHelp").addClass('display-none');
        if (regPath.test(projectNameValue)) {
            projectError.addClass('display-none');
            projectErrorText.html("");
            projectName.removeClass('wrong');
            return true;
        }
        else {
            if(projectNameValue.length == 0){
                projectErrorText.html(" Please enter your project name");
            }
            else{
                projectErrorText.html(" This field may only contain alphanumeric characters, underscores or hyphens, and can't be empty.");
            }
            projectError.removeClass('display-none');
            projectName.addClass('wrong');
            return false;
        }
    }

    var bMCChange = function (checkBox) {
        var checkBoxValue = jQuery(checkBox).val();
        if (checkBox.checked) {
            var isBelongToProject=false;
            addToHidden("build_machine_configuration", checkBoxValue, checkBox, isBelongToProject);
        }
        if (!checkBox.checked) {
            deleteFromHidden(document.getElementById("build_machine_configuration"), checkBox.id);
        }
    }

    function validAllView() {
        var view = jQuery("div[name=projectToBuild]");
        var textboxes;
        for (var i = 0; i < view.length; i++) {
            textboxes = view[i].getElementsByClassName("textbox");
            for (var j = 0; j < textboxes.length; j++) {
                if ((textboxes[j].name != "credentials") && (textboxes[j].name != "branchName") &&
                    (textboxes[j].name != "preScript") && (textboxes[j].name != "postScript")) {
                    textboxes[j].onblur();
                }

            }
        }
        var otherConfig =  jQuery('[name=userConfig]');
        for(var i=0; i< otherConfig.length; i++){
            otherConfig[i].onblur();
        }
    }

    var commentCheckboxChange = function (checkBox) {
        var comments = jQuery("#comments");
        if (!checkBox.checked) {
            comments.addClass('display-none');
            comments.val("");
        }
        else {
           comments.removeClass('display-none');
        }
    }
    function initCommentCheckbox(enable){
        var checkboxComment = jQuery("#isComment"); 
        var textareaComment = jQuery("#comments");
        if(enable){
            checkboxComment.prop('checked',true);
            textareaComment.removeClass('display-none');
        } 
        else{
            checkboxComment.prop('checked',false);
            textareaComment.addClass('display-none');
        }

    } 

    var deleteUser = function (element){
        jQuery(element).closest('div').remove();
     }

    var triggerHelp = function (element) {
        var name = element.name;
        var fieldHelp = jQuery('#' + name + '_helper');
        var fieldHelpBlock = jQuery(fieldHelp).closest('div[name=helpDiv]');
        if (fieldHelpBlock.attr("class") == "help-view-wide") {
            fieldHelpBlock.addClass('display-none');
        }
        else {
            buildConfiguration.getHelpMessage(name, function (t) {
                jQuery(fieldHelp).html(t.responseObject());
                jQuery(fieldHelpBlock).removeClass('display-none');
            });
       }
    }

    var checkOtherConfiguration = function(element){
        var regexp = /^([a-zA-Z0-9_-]*)$/;
        if(regexp.test(jQuery(element).val())){
            jQuery(element).closest('div').find('[name=userConfigErrorBlock]').addClass('display-none');
            jQuery(element).removeClass('wrong');
        }
        else{
            jQuery(element).addClass('wrong');
            jQuery(element).closest('div').find('[name=userConfigErrorBlock]').removeClass('display-none');
        }
    }
    


    var checkTrigger = function (value, id) {
        buildConfiguration.checkTrigger(value, function (t){
            var element = jQuery("#" + id + 'Message');
            element.html(t.responseObject());
            element.removeClass('display-none');
            if(element.text().includes('ERROR')){
                element.css("background-color","red");
            }
            else{
                element.css("background-color","antiquewhite");
            }
        });
    }

    return {
        initPage: initPage,
        addView: addView,
        setCurrentCredentialsAsDefault: setCurrentCredentialsAsDefault,
        loadViews: loadViews,
        addBuilder: addBuilder,
        deleteFromSelect : deleteFromSelect,
        emailCheckBoxChange: emailCheckBoxChange,
        versionFileCheckBoxChange: versionFileCheckBoxChange,
        isValidForm: isValidForm,
        rejectDiv: rejectDiv,
        rejectionSubmit: rejectionSubmit,
        setFormResultDialog: setFormResultDialog,
        addArtifactPath: addArtifactPath,
        addPathFiles: addPathFiles,
        imageHelp: imageHelp,
        validateMail: validateMail,
        checkURL: checkURL,
        checkPath: checkPath,
        checkPTB: checkPTB,
        OkReject: OkReject,
        CancelReject: CancelReject,
        isProjectNameValid: isProjectNameValid,
        bMCChange: bMCChange,
        getElementNumber:getElementNumber,
        deleteFromHidden:deleteFromHidden,
        closeElement:closeElement,
        disableOtherConfig:disableOtherConfig,
        fieldHelp:fieldHelp,
        commentCheckboxChange:commentCheckboxChange,
        deleteUser:deleteUser,
        addUserAccess:addUserAccess,
        addNewUserAccess:addNewUserAccess,
        triggerHelp:triggerHelp,
        checkOtherConfiguration:checkOtherConfiguration,
        checkTrigger:checkTrigger
    };
})(); //END OF CONFIGURATOR MODULE
window.onload = function () {
    configurator.initPage();
}