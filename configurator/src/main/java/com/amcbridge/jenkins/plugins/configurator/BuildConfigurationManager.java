package com.amcbridge.jenkins.plugins.configurator;

import com.amcbridge.jenkins.plugins.models.BuildConfigurationModel;
import com.amcbridge.jenkins.plugins.models.UserAccessModel;
import com.amcbridge.jenkins.plugins.enums.ConfigurationState;
import com.amcbridge.jenkins.plugins.enums.MessageDescription;
import com.amcbridge.jenkins.plugins.exceptions.JenkinsInstanceNotFoundException;
import com.amcbridge.jenkins.plugins.xstreamelements.SCM;
import com.amcbridge.jenkins.plugins.xstreamelements.SCMLoader;
import com.amcbridge.jenkins.plugins.job.JobManagerGenerator;
import com.amcbridge.jenkins.plugins.messenger.ConfigurationStatusMessage;
import com.amcbridge.jenkins.plugins.messenger.MailSender;
import com.amcbridge.jenkins.plugins.serialization.CredentialItem;
import com.amcbridge.jenkins.plugins.xstreamelements.ScriptType;
import com.amcbridge.jenkins.plugins.xstreamelements.ScriptTypeLoader;
import hudson.XmlFile;
import hudson.model.Node;
import hudson.model.User;
import hudson.scm.SCMDescriptor;
import hudson.security.AccessControlled;
import hudson.security.Permission;
import hudson.util.Iterators;
import jenkins.model.Jenkins;
import jenkins.model.JenkinsLocationConfiguration;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.lang.StringUtils;
import org.kohsuke.stapler.Ancestor;
import org.kohsuke.stapler.Stapler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.mail.MessagingException;
import javax.servlet.ServletException;
import javax.xml.bind.JAXBException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.xpath.XPathExpressionException;
import java.io.*;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;

public class BuildConfigurationManager {

    private static final String CONFIG_FILE_NAME = "config.xml";
    public static final String DATE_FORMAT = "MM/dd/yyyy";
    public static final String ENCODING = "UTF-8";
    private static final String CONFIG_JOB_FILE_NAME = "JobConfig.xml";
    private static final String BUILD_CONFIGURATOR_DIRECTORY_NAME = "/plugins/BuildConfiguration";
    private static final String CONTENT_FOLDER = "userContent";
    public static final String STRING_EMPTY = "";
    private static final MailSender mail = new MailSender();
    private static final Logger logger = LoggerFactory.getLogger(BuildConfigurationManager.class);
    private static SCMLoader scmLoader;
    private static final String DEFAULT_CREDENTIALS_PROPERTIES_FILE_NAME = "credentialsDefaults.properties";
    private static final String CREDENTIALS_PROPERTY_NAME = "defaultCredentials";

    public static String getCurrentUserID() {
        User user = User.current();
        if (user != null) {
            return user.getId();
        } else {
            return STRING_EMPTY;
        }
    }

    public static String getCurrentUserFullName() {
        User user = User.current();
        if (user != null) {
            return user.getFullName();
        } else {
            return STRING_EMPTY;
        }
    }

    private static File getConfigFileFor(String id) throws JenkinsInstanceNotFoundException {
        return new File(new File(getRootDir(), id), CONFIG_FILE_NAME);
    }


    public static File getFileToCreateJob() throws JenkinsInstanceNotFoundException {
        return new File(getRootDir() + "/" + CONFIG_JOB_FILE_NAME);
    }

    private static File getRootDir() throws JenkinsInstanceNotFoundException {
        return new File(BuildConfigurationManager.getJenkins().getRootDir(),
                BUILD_CONFIGURATOR_DIRECTORY_NAME);
    }

    private static String getRootDirectory() throws JenkinsInstanceNotFoundException {
        return BuildConfigurationManager.getJenkins().getRootDir() + "/"
                + BUILD_CONFIGURATOR_DIRECTORY_NAME;
    }

    private static String getUserContentFolder() throws JenkinsInstanceNotFoundException {
        return BuildConfigurationManager.getJenkins().getRootDir() + "/" + CONTENT_FOLDER;
    }

    static void save(BuildConfigurationModel config, boolean isDiff) throws IOException {
        if (config.getProjectName().isEmpty()) {
            deleteFiles(config.getScripts(), getUserContentFolder());
            return;
        }

        String projectPath = isDiff ? config.getProjectName() + "/diff/" : config.getProjectName();

        File checkFile = new File(getRootDirectory() + "/" + projectPath);
        if (!checkFile.exists()) {
            if(!checkFile.mkdirs()) {
                throw new IOException("Unable to create path:" + checkFile.getPath());
            }
        }

        XmlFile fileWriter = getConfigFile(projectPath);
        fileWriter.write(config);
    }

    private static XmlFile getConfigFile(String nameProject) throws JenkinsInstanceNotFoundException {
        return new XmlFile(Jenkins.XSTREAM, getConfigFileFor("/" + nameProject));
    }

    public static BuildConfigurationModel load(String nameProject) throws IOException {
        BuildConfigurationModel result = new BuildConfigurationModel();
        XmlFile config = getConfigFile(nameProject);

        if (config.exists()) {
            config.unmarshal(result);
        }
        return result;
    }

    static List<BuildConfigurationModel> loadAllConfigurations()
            throws IOException {
        List<BuildConfigurationModel> configs = new ArrayList<>();
        File file = new File(getRootDirectory());
        if (!file.exists() || file.listFiles((FileFilter) DirectoryFileFilter.DIRECTORY) == null) {
            return new LinkedList<>();
        }
        File[] directories = file.listFiles((FileFilter) DirectoryFileFilter.DIRECTORY);
        if (directories != null) {
            for (File directory : directories) {
                File configFile = new File(directory, "config.xml");
                if (isCurrentUserHasAccess(directory.getName()) && configFile.exists()) {
                    configs.add(load(directory.getName()));
                }
            }
        }
        return configs;
    }

    private static void deleteFiles(String[] files, String pathFolder) throws IOException {
        File file;
        for (String strFile : files) {
            if (strFile.isEmpty()) {
                continue;
            }
            file = new File(pathFolder + "/" + strFile);
            if(!file.delete()) {
                throw new IOException("Unable to delete " + file.getPath());
            }
        }
    }

    static void markConfigurationForDeletion(String name) throws IOException, ParserConfigurationException,
            JAXBException, MessagingException {
        BuildConfigurationModel config = load(name);
        if (config.getState() == ConfigurationState.FOR_DELETION) {
            return;
        }
        config.setState(ConfigurationState.FOR_DELETION);
        config.initCurrentDate();
        save(config,false);
        sendEmailOnChangeConfiguration(config,MessageDescription.MARKED_FOR_DELETION);
    }

    static void restoreConfiguration(String name) throws IOException, ParserConfigurationException,
            JAXBException, MessagingException {
        BuildConfigurationModel config = load(name);
        config.setState(ConfigurationState.UPDATED);
        save(config,false);
        sendEmailOnChangeConfiguration(config,MessageDescription.RESTORE);
    }

    private static void sendEmailOnChangeConfiguration(BuildConfigurationModel config,
                                                       MessageDescription messageDescription)
            throws MessagingException {
        String userEmail = StringUtils.EMPTY;
        if (!getUserMailAddress(config).isEmpty()) {
            userEmail = getUserMailAddress(config);
        }
        ConfigurationStatusMessage message = new ConfigurationStatusMessage(config.getProjectName(),
                getAdminEmail(), userEmail, messageDescription.toString(),
                config.getProjectName());
        mail.sendMail(message);
    }

    public static Boolean isNameUsing(String name) throws JenkinsInstanceNotFoundException {
        File checkName = new File(getRootDirectory() + "/" + name);
        return checkName.exists();
    }

    static void deleteConfigurationPermanently(String name) throws IOException, MessagingException {
        File checkFile = new File(getRootDirectory() + "/" + name);
        BuildConfigurationModel config = load(name);
        if (checkFile.exists()) {
            FileUtils.deleteDirectory(checkFile);
        }

        ConfigurationStatusMessage message = new ConfigurationStatusMessage(config.getProjectName());
        message.setSubject(config.getProjectName());
        message.setDescription(MessageDescription.DELETE_PERMANENTLY.toString());
        if (!getUserMailAddress(config).isEmpty()) {
            message.setCC(BuildConfigurationManager.getUserMailAddress(config));
        }
        message.setDestinationAddress(getAdminEmail());
        mail.sendMail(message);
    }

    static Boolean isCurrentUserHasAccess(String name) throws IOException {
        boolean isUserAdmin = isCurrentUserAdministrator();
        boolean isUserInAccessList = false;

        if (isUserAdmin) {
            return true;
        }
        BuildConfigurationModel configs = load(name);
        List<UserAccessModel> usersList = configs.getUserWithAccess();
        if (usersList != null) {
            isUserInAccessList = configs.getUserWithAccess().contains(new UserAccessModel(getCurrentUserID()));
        }
        boolean isCurrentUserCreator = configs.getCreator().equals(getCurrentUserID());
        return isUserInAccessList || isCurrentUserCreator;
    }

    public static String[] getPath(String path) {
        String fixedPath = path;
        if (fixedPath == null || fixedPath.equals(STRING_EMPTY)) {
            return new String[0];
        }
        if (fixedPath.lastIndexOf(';') == fixedPath.length() - 1) {
            fixedPath = fixedPath.substring(0, fixedPath.lastIndexOf(';'));
        }
        return fixedPath.split(";");
    }

    public static Boolean isCurrentUserAdministrator() throws JenkinsInstanceNotFoundException {
        Jenkins inst = BuildConfigurationManager.getJenkins();
        Permission permission = Jenkins.ADMINISTER;

        if (inst != null) {
            return inst.hasPermission(permission);
        } else {
            List<Ancestor> ancs = Stapler.getCurrentRequest().getAncestors();
            for (Ancestor anc : Iterators.reverse(ancs)) {
                Object o = anc.getObject();
                if (o instanceof AccessControlled) {
                    return ((AccessControlled) o).hasPermission(permission);
                }
            }
            return BuildConfigurationManager.getJenkins().hasPermission(permission);
        }
    }

    static BuildConfigurationModel getConfiguration(String name) throws IOException {

        if (!isCurrentUserHasAccess(name)) {
            return null;
        }
        return load(name);
    }

    public static String getAdminEmail() {
        JenkinsLocationConfiguration configuration = JenkinsLocationConfiguration.get();
        if (configuration != null) {
            return configuration.getAdminAddress();
        } else {
            return STRING_EMPTY;
        }
    }

    public static String getUserMailAddress(BuildConfigurationModel config) {
        if (config.getConfigEmail() != null) {
            String[] address = config.getConfigEmail().split(" ");
            return StringUtils.join(address, ",");
        }
        return StringUtils.EMPTY;
    }

    public static List<String> getSCM() throws JenkinsInstanceNotFoundException {
        List<String> supportedSCMs = new ArrayList<>();
        boolean isGitCatch = false;
        boolean isSubversionCatch = false;
        for (SCMDescriptor<?> scm : hudson.scm.SCM.all()) {
            if (isSupportedSCM(scm)) {
                supportedSCMs.add(scm.getDisplayName());
                if ("git".equalsIgnoreCase(scm.getDisplayName())) {
                    isGitCatch = true;
                } else if ("subversion".equalsIgnoreCase(scm.getDisplayName())) {
                    isSubversionCatch = true;
                }
            }
        }
        if (isGitCatch) {
            logger.info("+++++ git: plugin was plugged");
        } else {
            logger.info("----- git: plugin wasn't plugged");
        }
        if (isSubversionCatch) {
            logger.info("+++++ subversion: plugin was plugged");
        } else {
            logger.info("----- subversion: plugin wasn't plugged");
        }

        return supportedSCMs;
    }

    private static Boolean isSupportedSCM(SCMDescriptor<?> scm) throws JenkinsInstanceNotFoundException {
        scmLoader = new SCMLoader();
        for (SCM supportSCM : scmLoader.getSCMs()) {
            if (supportSCM.getKey().equalsIgnoreCase(scm.getDisplayName())) {
                return true;
            }
        }
        return false;
    }

    public static List<String> getNodesName() throws JenkinsInstanceNotFoundException {
        List<String> nodeNames = new ArrayList<>();
        for (Node node : BuildConfigurationManager.getJenkins().getNodes()) {
            nodeNames.add(node.getNodeName());
        }
        return nodeNames;
    }

    static void createJob(String name)
            throws IOException, ParserConfigurationException,
            SAXException, TransformerException, JAXBException, XPathExpressionException {
        BuildConfigurationModel config = load(name);
        JobManagerGenerator.createJob(config);
        config.setJobUpdate(true);
        save(config,false);
    }

    static void deleteJob(String name)
            throws IOException, InterruptedException, ParserConfigurationException, JAXBException {
        JobManagerGenerator.deleteJob(name);
        BuildConfigurationModel config = BuildConfigurationManager.load(name);
        if (config.getProjectName() != null && config.getState().equals(ConfigurationState.APPROVED)) {

            config.setJobUpdate(false);
            BuildConfigurationManager.save(config,false);
        }
    }

    public static void setDefaultCredentials(String credentials) throws IOException {
        Properties prop = new Properties();
        File path = getRootDir();
        if (!path.exists() ||  !path.mkdirs()) {
            throw new IOException("Unable to create path" + path.getPath());
        }
        try (OutputStream output = new FileOutputStream(path + "/" + DEFAULT_CREDENTIALS_PROPERTIES_FILE_NAME);) {
            prop.setProperty(CREDENTIALS_PROPERTY_NAME, credentials);
            prop.store(output, null);

        } catch (IOException e) {
            logger.error("Error setting credentials as default", e);
        }
    }

    public static String getDefaultCredentials() throws JenkinsInstanceNotFoundException {
        Properties prop = new Properties();
        File propertiesFile = new File(getRootDir(), DEFAULT_CREDENTIALS_PROPERTIES_FILE_NAME);
        String defaultCredentials;
        if (!propertiesFile.exists()) {
            return "not selected";
        }

        try (InputStream input = new FileInputStream(propertiesFile)) {
            prop.load(input);
            defaultCredentials = prop.getProperty(CREDENTIALS_PROPERTY_NAME);

        } catch (IOException ex) {
            logger.error("Error getting default credentials", ex);
            return "not selected";
        }

        return defaultCredentials;
    }

    public static List<CredentialItem> openCredentials() throws IOException {

        String jenkinsHomePath = BuildConfigurationManager.getJenkins().getRootDir().getPath();
        List<CredentialItem> credentialItemList = new ArrayList<>();
        String fileName = jenkinsHomePath + "/credentials.xml";

        try {
            File fXmlFile = new File(fileName);
            if (!fXmlFile.exists()){
                return new LinkedList<>();
            }
            DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
            DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
            Document doc = dBuilder.parse(fXmlFile);

            doc.getDocumentElement().normalize();
            NodeList nList = doc.getElementsByTagName("java.util.concurrent.CopyOnWriteArrayList");
            for (int temp = 0; temp < nList.getLength(); temp++) {
                org.w3c.dom.Node nNode = nList.item(temp);
                if (nNode.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE) {
                    Element eElement = (Element) nNode;
                    NodeList nodeList = eElement.getChildNodes();
                    for (int i = 0; i < nodeList.getLength(); i++) {
                        org.w3c.dom.Node curNode = nodeList.item(i);
                        if (curNode.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE) {
                            Element curElement = (Element) curNode;
                            CredentialItem crItem = new CredentialItem();
                            if (curElement.getElementsByTagName("scope").item(0) != null &&
                                    curElement.getElementsByTagName("scope").item(0).getTextContent() != null) {
                                    crItem.setScope(curElement.getElementsByTagName("scope").item(0).getTextContent());
                            }
                            if (curElement.getElementsByTagName("id").item(0) != null &&
                                    curElement.getElementsByTagName("id").item(0).getTextContent() != null) {
                                    crItem.setId(curElement.getElementsByTagName("id").item(0).getTextContent());
                            }
                            if (curElement.getElementsByTagName("username").item(0) != null &&
                                    curElement.getElementsByTagName("username").item(0).getTextContent() != null) {
                                    crItem.setUsername(curElement.getElementsByTagName("username").item(0).getTextContent());
                            }
                            if (curElement.getElementsByTagName("description").item(0) != null &&
                                    curElement.getElementsByTagName("description").item(0).getTextContent() != null) {
                                    crItem.setDescription(curElement.getElementsByTagName("description").item(0).getTextContent());
                            }
                            credentialItemList.add(crItem);
                        }
                    }
                }
            }
        } catch (ParserConfigurationException | SAXException e) {
            logger.error("Parsing credentials file error", e);
            throw new RuntimeException("Parsing credentials file error", e);
        }
        return credentialItemList;
    }

    public static Jenkins getJenkins() throws JenkinsInstanceNotFoundException {
        Jenkins instance = Jenkins.getInstance();
        if (instance == null) {
            throw new JenkinsInstanceNotFoundException("Jenkins instance not found");
        }
        return Jenkins.getInstance();
    }

    public static List<ScriptType> getScriptTypes() throws JenkinsInstanceNotFoundException {
        ScriptTypeLoader loader = new ScriptTypeLoader();
        return loader.getScriptTypeList();
    }
}
