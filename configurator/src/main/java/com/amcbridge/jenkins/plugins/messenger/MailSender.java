package com.amcbridge.jenkins.plugins.messenger;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import javax.mail.*;
import javax.mail.internet.*;

import com.amcbridge.jenkins.plugins.configurator.BuildConfigurationManager;
import com.amcbridge.jenkins.plugins.configurator.BuildConfigurator;
import com.amcbridge.jenkins.plugins.exceptions.JenkinsInstanceNotFoundException;
import jenkins.model.Jenkins;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MailSender implements Runnable {
    private String host;
    private String from;
    private String pass;
    private Integer port;
    private static MessageInfo message;
    private static final String MAIL_PROPERTIES_FILE_NAME = "/plugins/build-configurator/config/MailSender.properties";
    private static final Logger logger = LoggerFactory.getLogger(BuildConfigurator.class);

    public void sendMail(MessageInfo message) throws MessagingException {
        if(message != null) {
            setMessage(message);
        }
        Thread theard = new Thread(new MailSender());
        theard.start();
    }

    private synchronized static void setMessage(MessageInfo m) {message = m;
    }

    private static MessageInfo getMessage() {
        return message;
    }

    private void load() {
        Properties prop = new Properties();
        try (InputStream inputStream = new FileInputStream(BuildConfigurationManager.getJenkins().getRootPath() + MAIL_PROPERTIES_FILE_NAME)) {

            prop.load(inputStream);
            host = prop.getProperty("host");
            from = prop.getProperty("from");
            pass = prop.getProperty("pass");
            port = Integer.parseInt(prop.getProperty("port"));
        } catch (Exception ex) {
            logger.error("Error loading mail properties", ex);
        }
    }

    public MailSender() {
        load();
    }

    @Override
    public void run() {
        try {
            MessageInfo message = getMessage();
            Boolean isRecepients = false;
            Properties props = System.getProperties();
            props.put("mail.smtp.host", host);
            props.put("mail.smtp.port", port);
            if (pass.isEmpty()) {
                props.put("mail.smtp.auth", "false");
            } else {
                props.put("mail.smtp.auth", "true");
            }
            props.put("mail.smtp.starttls.enable", "true");
            Session session = Session.getDefaultInstance(props, null);
            MimeMessage mMessage = new MimeMessage(session);
            mMessage.setFrom(new InternetAddress(from));
            if (message.getCC() != null && !message.getCC().isEmpty()) {
                if (message.getCC().contains(",")) {
                    InternetAddress[] address = InternetAddress.parse(message.getCC().trim());
                    mMessage.setRecipients(Message.RecipientType.CC, address);
                } else {
                    InternetAddress to_address = new InternetAddress(message.getCC().trim());
                    mMessage.addRecipient(Message.RecipientType.CC, to_address);
                }
                isRecepients = true;
            }
            if (message.getDestinationAddress() != null && message.getDestinationAddress().contains("@")
                    && !message.getDestinationAddress().trim().contains(" ")) {
                mMessage.setRecipient(Message.RecipientType.TO, new InternetAddress(message.getDestinationAddress()));
                isRecepients = true;
            }
            if (isRecepients) {
                mMessage.setSubject(message.getSubject(), BuildConfigurationManager.ENCODING);
                mMessage.setText(message.getMassageText(), BuildConfigurationManager.ENCODING);
                Transport transport = session.getTransport("smtp");
                if (pass.isEmpty()) {
                    transport.connect(host, from);
                } else {
                    transport.connect(host, from, pass);
                }
                transport.sendMessage(mMessage, mMessage.getAllRecipients());
                transport.close();
            }
        } catch (MessagingException e) {
            logger.error("Error sending mail", e);
        }
    }

    public static String getMailPropertiesFileName() throws JenkinsInstanceNotFoundException {
        return BuildConfigurationManager.getJenkins().getRootPath() + MAIL_PROPERTIES_FILE_NAME;
    }
}