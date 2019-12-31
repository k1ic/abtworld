/* eslint-disable react/jsx-one-expression-per-line */
import React, { Component } from 'react';
import qs from 'querystring';
import styled from 'styled-components';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useToggle from 'react-use/lib/useToggle';
import { fromUnitToToken } from '@arcblock/forge-util';
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
  Tooltip 
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
      asset_did: '',
      news_item: null,
    };
  }
  
  /*Fetch App data*/
  async fetchAppData(){
    try {
      const { status, data} = await api.get('/api/session');
      this.setState({
        session: data
      }, ()=>{
        this.fetchNewsItem();
      });
    } catch (err) {
    }
    return {};
  }
  
  /*Fetch news item */
  fetchNewsItem = () => {
    reqwest({
      url: '/api/newsflashget',
      method: 'get',
      data: {
        cmd: 'getNewsItem',
        asset_did: this.state.asset_did,
      },
      type: 'json',
    }).then(data => {
      
      this.setState({
        news_item: data
      }, ()=>{
        console.log('fetchNewsItem news_item=', this.state.news_item);
      });
    });
  };
  
  /*component mount process*/
  componentDidMount() {
    const location_hash = window.location.hash.slice(1);
    const location_search = window.location.search.slice(1);
    
    if(typeof(location_search) != "undefined" && location_search && location_search.length > 0) {
      const params = qs.parse(location_search);
      if(params.asset_did){
        this.setState({
          asset_did: params.asset_did
        },()=>{
          console.log('componentDidMount asset_did=', this.state.asset_did);
          
          /*fetch app data*/
          this.fetchAppData();
        });
      }else{
        window.location.href = '/newsflash#type=articles';
        return null;
      }
    }else{
       window.location.href = '/newsflash#type=articles';
       return null;
    }
    
    if(typeof(location_hash) != "undefined" && location_hash && location_hash.length > 0) {
      const hashArr = location_hash.split('?');
      const params = qs.parse(hashArr[0]);
    }
  }
  
  /*component unmount process*/
  componentWillUnmount() {
  }
  
  render() {
    const { 
      session, 
      asset_did, 
      news_item } = this.state;
    //console.log('render session=', session);
    //console.log('render props=', this.props);
    
    if (!session || !news_item) {
      return (
        <Layout title="Article">
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
    
    return (
      <Layout title="Article">
        <Main>
          <LocaleProvider locale={zh_CN}>
            <div className="clearfix">
            </div>
          </LocaleProvider>
        </Main>
      </Layout>
    );
  }
}

const Main = styled.main`
  margin: 20px 0 0;
  
`;

export default App;