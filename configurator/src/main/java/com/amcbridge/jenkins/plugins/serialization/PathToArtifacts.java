package com.amcbridge.jenkins.plugins.serialization;

import com.google.common.collect.Lists;
import java.util.List;
import com.thoughtworks.xstream.annotations.XStreamImplicit;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class PathToArtifacts {

    @XStreamImplicit(itemFieldName = "file")
    private List<String> files;

    public PathToArtifacts() {
        this.files = Lists.newLinkedList();
    }

    public void setFiles(List<String> value) {
        files = value;
    }

    public List<String> getFiles() {
        return files;
    }

    public void addFile(String value) {
        files.add(value);
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof PathToArtifacts) {
            return new EqualsBuilder()
                    .append(this.files, ((PathToArtifacts)obj).files)
                    .isEquals();
        } else {
            return false;
        }
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder()
                .append(this.files)
                .toHashCode();
    }
}
