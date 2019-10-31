/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import CircularProgress from '@material-ui/core/CircularProgress';
import { LocaleProvider, Upload, Icon, Modal, Button, message, Typography, Input, Tooltip } from "antd";
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import reqwest from 'reqwest';
import 'antd/dist/antd.css';
import Auth from '@arcblock/did-react/lib/Auth';

import Layout from '../components/layout';
import useSession from '../hooks/session';
import forge from '../libs/sdk';
import api from '../libs/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const isProduction = process.env.NODE_ENV === 'production';

function getBase64(img, callback) {
  const reader = new FileReader();
  reader.addEventListener('load', () => callback(reader.result));
  reader.readAsDataURL(img);
}

function formatNumber(value) {
  value += '';
  const list = value.split('.');
  const prefix = list[0].charAt(0) === '-' ? '-' : '';
  let num = prefix ? list[0].slice(1) : list[0];
  let result = '';
  while (num.length > 3) {
    result = `,${num.slice(-3)}${result}`;
    num = num.slice(0, num.length - 3);
  }
  if (num) {
    result = num + result;
  }
  return `${prefix}${result}${list[1] ? `.${list[1]}` : ''}`;
}

class NumericInput extends React.Component {
  onChange = e => {
    const { value } = e.target;
    const reg = /^-?(0|[1-9][0-9]*)(\.[0-9]*)?$/;
    if ((!isNaN(value) && reg.test(value)) || value === '' || value === '-') {
      this.props.onChange(value);
    }
  };

  // '.' at the end or only '-' in the input box.
  onBlur = () => {
    const { value, onBlur, onChange } = this.props;
    if (value.charAt(value.length - 1) === '.' || value === '-') {
      onChange(value.slice(0, -1));
    }
    if (onBlur) {
      onBlur();
    }
  };

  render() {
    const { value } = this.props;
    const title = value ? (
      <span className="numeric-input-title">{value !== '-' ? formatNumber(value) : '-'}</span>
    ) : (
      'Input a number'
    );
    return (
      <Tooltip
        trigger={['focus']}
        title={title}
        placement="topLeft"
        overlayClassName="numeric-input"
      >
        <Input
          {...this.props}
          onChange={this.onChange}
          onBlur={this.onBlur}
          placeholder="如: 0.88"
          maxLength={10}
        />
      </Tooltip>
    );
  }
}

class App extends Component {  
  static async getInitialProps({pathname, query, asPath, req}) {
    console.log('getInitialProps query=', query);
    return {};
  }
  
  constructor(props) {
    super(props);
    
    /*initial state*/
    this.state = {
      session: null,
      pic_title: '',
      pic_description: '',
      pic_worth: '',
      previewVisible: false,
      previewView: true,
      previewImage: "",
      fileList: [],
      imageUrl: null,
    };
  }
  
  /*Fetch App data*/
  async fetchAppData(){
    try {
      const { status, data} = await api.get('/api/session');
      this.setState({session: data});
    } catch (err) {
    }
    return {};
  }
  
  /*component mount process*/
  componentDidMount() {
    this.fetchAppData();
  }
  
  /*component unmount process*/
  componentWillUnmount() {
  }
  
  handleUploadChange = ({ fileList }) => {
    console.log('handleUploadChange fileList.length=', fileList.length);
    
    /*filter out invalid picture*/
    for(var i=0;i<fileList.length;i++){
      const file = fileList[i];
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        //message.error('只能上传JPG/PNG图片!');
        Modal.error({title: '只能上传JPG/PNG图片!'});
        
        const index = fileList.indexOf(file);
        const newFileList = fileList.slice();
        newFileList.splice(index, 1);
        fileList = newFileList;
      }else{
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
          //message.error('图片大小需小于5MB!');
          Modal.error({title: '图片大小需小于5MB!'});
        
          const index = fileList.indexOf(file);
          const newFileList = fileList.slice();
          newFileList.splice(index, 1);
          fileList = newFileList;
        }
      }
    }
    
    if(fileList && fileList.length >= 1){
      getBase64(fileList[0].originFileObj, image =>
        this.setState({
          imageUrl: image,
        })
      );
    }
    
    this.setState({ fileList });
  };
  
  /*Upload handler*/
  handleUpload = () => {
    const { session, fileList, imageUrl, pic_title, pic_description, pic_worth} = this.state;
    const { user, token } = session;
    const formData = new FormData();
    fileList.forEach((file) => {
      //console.log('handleUpload file=', file);
      formData.append('files', JSON.stringify(file));
    });
    //console.log('handleUpload token=', token);
    //console.log('handleUpload imageUrl=', imageUrl);
    formData.append('user', JSON.stringify(user));
    formData.append('token', JSON.stringify(token));
    formData.append('imageUrl', JSON.stringify(imageUrl));
    formData.append('pic_title', pic_title);
    formData.append('pic_description', pic_description);
    formData.append('pic_worth', pic_worth);
    
    this.setState({
      uploading: true,
    });
    
    // You can use any AJAX library you like
    reqwest({
      url: '/api/picUpload',
      method: 'post',
      processData: false,
      data: formData,
      success: () => {
        this.setState({
          fileList: [],
          imageUrl: null,
          uploading: false,
          pic_title: '',
          pic_description: '',
          pic_worth: ''
        });
        //message.success('上传成功');
        Modal.success({title: '上传成功'});
      },
      error: () => {
        this.setState({
          uploading: false,
        });
        //message.error('上传失败');
        Modal.error({title: '上传失败'});
      },
    });
  }
  
  handlePreviewCancel = () => this.setState({ previewVisible: false });
 
  handlePreview = file => {
    this.setState({
      previewImage: file.url || file.thumbUrl,
      previewVisible: true
    });
  };
  
  onTitleInputChange = ({ target: { value } }) => {
    //console.log('onTitleInputChange value='+value+' length='+value.length);
    this.setState({ pic_title: value });
  };
  onDescriptionInputChange = ({ target: { value } }) => {
    //console.log('onDescriptionInputChange value='+value+' length='+value.length);
    this.setState({ pic_description: value });
  };
  onPicWorthChange = value => {
    this.setState({ pic_worth: value });
  };
  
  render() {
    const session = this.state.session;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session) {
      return (
        <Layout title="Upload">
          <Main>
            <CircularProgress />
          </Main>
        </Layout>
      );
    }
    
    if ( isProduction && !session.user) {
      console.log('render user not exist');
      window.location.href = '/?openLogin=true';
      return null;
    }
    
    const { user, token } = session;
    //console.log('render session.user=', user);
    //console.log('render session.token=', token);
    
    const { previewVisible,previewView, previewImage, fileList, pic_title, pic_description, pic_worth } = this.state;
    
    const props = {
      // action: '/api/picUpload',
      onRemove: (file) => {
        this.setState(({ fileList }) => {
          const index = fileList.indexOf(file);
          const newFileList = fileList.slice();
          newFileList.splice(index, 1);
          return {
            fileList: newFileList,
          };
        });
      },
      beforeUpload: (file) => {
        return false;
      },
      fileList: this.state.fileList,
      listType:"picture-card",
      onPreview: this.handlePreview,
      onChange: this.handleUploadChange,
    }
    
    const uploadButton = (
      <div>
        <Icon type="plus" />
        <div className="ant-upload-text">添加</div>
      </div>
    );
    
    return (
      <Layout title="Upload">
        <Main>
          <LocaleProvider locale={zh_CN}>
            <div className="clearfix">
              <Title level={4}>付费资源上传</Title>
              <div style={{ margin: '24px 0' }} />
              <Text>图片标题</Text>
              <TextArea
                value={pic_title}
                onChange={this.onTitleInputChange}
                placeholder="如: 颐和园地图(9字以内)"
                autoSize={{ minRows: 1, maxRows: 1 }}
                maxLength={9}
              />
              <div style={{ margin: '24px 0' }} />
              <Text>图片描述</Text>
              <TextArea
                value={pic_description}
                onChange={this.onDescriptionInputChange}
                placeholder="如: 游玩时花15元人民币买的颐和园地图(1000字以内)"
                autoSize={{ minRows: 1, maxRows: 10 }}
                maxLength={1000}
              />
              <div style={{ margin: '24px 0' }} />
              <Text>定价({token.symbol})</Text>
              <div>
                <NumericInput style={{ width: 200 }} value={pic_worth} onChange={this.onPicWorthChange} />
              </div>
              <div style={{ margin: '24px 0' }} />
              <Text>图片(jpg/png 5M以内)</Text>
              <Upload{...props}           
              >
                {fileList.length >= 1 ? null : uploadButton}
              </Upload>
              <Modal
                visible={previewVisible}
                footer={null}
                onCancel={this.handlePreviewCancel}
              >
                <img alt="picture" style={{ width: "100%" }} src={previewImage} />
              </Modal>
              <Button
                key="submit"
                type="primary"
                size="large"
                onClick={this.handleUpload}
                disabled={this.state.fileList.length === 0 
                   || this.state.imageUrl === ''
                   || this.state.pic_title === ''
                   || this.state.pic_description === ''
                   || this.state.pic_worth === ''}
                loading={this.state.uploading}
              >
                上传
              </Button>
            </div>
          </LocaleProvider>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 20px 0 0;
  
  .section__header {
    margin-bottom: 20px;
  }
`;

export default App;