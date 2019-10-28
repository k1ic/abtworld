﻿import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import Layout from '../components/layout';
import { LocaleProvider, Pagination, DatePicker, Upload, Icon, Modal, message } from 'antd';
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import 'antd/dist/antd.css';

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

class App extends Component {
  state = {
    loading: false,
    previewImageVisible: false,
    previewImage: '',
    fileList: [],
  };

  beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      //message.error('You can only upload JPG/PNG file!');
      Modal.error({title: 'You can only upload JPG/PNG file!'});
      this.setState({ loading: false });
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      //message.error('Image must smaller than 2MB!');
      Modal.error({title: 'Image must smaller than 2MB!'});
      this.setState({ loading: false });
      return false;
    }
    return isJpgOrPng && isLt2M;
  }

  handleImagePreviewCancel = () => this.setState({ previewImageVisible: false });

  handleImagePreview = async file => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    
    console.log('handleImagePreview file.url=', file.url);
    console.log('handleImagePreview file.preview=', file.preview);
    
    this.setState({
      previewImage: file.url || file.preview,
      previewImageVisible: true,
    });
  };

  handleUploadChange = ({ fileList }) => this.setState({ fileList });
  
  onShowSizeChange(current, pageSize) {
    console.log(current, pageSize);
  }
  
  onPageChange(pageNumber) {
    console.log('Page: ', pageNumber);
  }
  render() {
    const { previewImageVisible, previewImage, fileList } = this.state;
    
    const uploadButton = (
      <div>
        <Icon type="plus" />
        <div className="ant-upload-text">上传</div>
      </div>
    );
    
    return (
      <Layout title="Home">
        <Main>
          <LocaleProvider locale={zh_CN}>
            <div style={{ margin: 20 }}>
              <Pagination defaultCurrent={1} total={50} />
              <Pagination showSizeChanger onShowSizeChange={this.onShowSizeChange} onChange={this.onChange} defaultCurrent={1} total={500} />
              <Pagination showQuickJumper defaultCurrent={1} total={500} onChange={this.onPageChange} />
              <DatePicker />
            </div>
            <div className="clearfix">
              <Upload
                action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
                listType="picture-card"
                showUploadList={false}
                fileList={fileList}
                beforeUpload={this.beforeUpload}
                onPreview={this.handleImagePreview}
                onChange={this.handleUploadChange}
              >
              {fileList.length >= 1 ? null : uploadButton}
              </Upload>
              <Modal visible={previewImageVisible} footer={null} onCancel={this.handleImagePreviewCancel}>
                <img alt="picture" style={{ width: '100%' }} src={previewImage} />
              </Modal>
            </div>
          </LocaleProvider>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 20px 0 0;

  .ant-upload-select-picture-card i {
    font-size: 32px;
    color: #999;
  }
  
  .ant-upload-select-picture-card .ant-upload-text {
    margin-top: 8px;
    color: #666;
  }
  
`;

export default App;