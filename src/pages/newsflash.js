/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
import Avatar from '@arcblock/did-react/lib/Avatar';
import CircularProgress from '@material-ui/core/CircularProgress';
import { 
  LocaleProvider, 
  Upload, 
  Icon, 
  Modal, 
  Button, 
  message, 
  Typography, 
  Input, 
  Tooltip,
  List
} from "antd";
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

const list_items_per_page = 5;
const listData = [];
for (let i = 0; i < 23; i++) {
  listData.push({
    href: 'http://ant.design',
    title: `ant design part ${i}`,
    description:
      'Ant Design, a design language for background applications, is refined by Ant UED Team.',
    content:
      'We supply a series of design principles, practical patterns and high quality design resources (Sketch and Axure), to help people create their product prototypes beautifully and efficiently.',
  });
}

const IconText = ({ type, text }) => (
  <span>
    <Icon type={type} style={{ marginRight: 8 }} />
    {text}
  </span>
);

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
  
  render() {
    const session = this.state.session;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session) {
      return (
        <Layout title="NewsFlash">
          <Main>
            <CircularProgress />
          </Main>
        </Layout>
      );
    }
    
    //if ( isProduction && !session.user) {
    //  console.log('render user not exist');
    //  window.location.href = '/?openLogin=true';
    //  return null;
    //}
    
    const { user, token } = session;
    //console.log('render session.user=', user);
    console.log('render session.token=', token);
    
    return (
      <Layout title="NewsFlash">
        <Main>
          <LocaleProvider locale={zh_CN}>
            <List
              itemLayout="vertical"
              size="large"
              pagination={{
                onChange: page => {
                  console.log(page);
                },
                pageSize: list_items_per_page,
              }}
              dataSource={listData}
              footer={null}
              renderItem={item => (
                <List.Item
                  key={item.title}
                  actions={[]}
                  extra={null}
                  className="antd-list-item"
                >
                  <List.Item.Meta
                    avatar={<Avatar size={30} did={user?user.did:''} />}
                    title={<a href={item.href} className="antd-list-item-meta-title">{item.title} </a>}
                    description={null/*item.description*/}
                  />
                  {item.content}
                </List.Item>
              )}
            />
          </LocaleProvider>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 20px 0 0;
  
  .antd-list-item{
    font-size: 1.0rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 200;
    color: #000000;
  }
  
  .antd-list-item-meta-title{
    font-size: 1.5rem;
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 500;
    color: #434343;
  }
`;

export default App;