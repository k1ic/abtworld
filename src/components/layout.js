import React, { useEffect } from 'react';
import {
  useLocation
} from "react-router-dom";
import qs from 'querystring';
import PropTypes from 'prop-types';
import AppBar from '@material-ui/core/AppBar';
import Container from '@material-ui/core/Container';
import styled from 'styled-components';
import Helmet from 'react-helmet';

import Header from './header';
import Footer from './footer';

import env from '../libs/env';

import { setToken } from '../libs/auth';

export default function Layout({ title, children, contentOnly }) {
  
  // If a login token exist in url, set that token in storage
  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    if(params.loginToken){
      //console.log('Save login token', params.loginToken);
      setToken(params.loginToken);
      
      const location = window.location;
      if(location){
        delete params.loginToken;
        const redirectUrl = `${location.pathname}?${qs.stringify(params)}`;
          
        console.log('Redirect Url', redirectUrl);
        window.history.replaceState({}, window.title, redirectUrl);
      }
    }
  }, []);
  
  if (contentOnly) {
    return <Container>{children}</Container>;
  }

  return (
    <Div>
      <Helmet title={`${title} - ${env.appName}`} />
      <AppBar position="static" color="default">
        <Container>
          <Header />
        </Container>
      </AppBar>
      <Container style={{ minHeight: '60vh' }}>{children}</Container>
      <Footer />
    </Div>
  );
}

Layout.propTypes = {
  title: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  children: PropTypes.any.isRequired,
  contentOnly: PropTypes.bool,
};

Layout.defaultProps = {
  contentOnly: false,
};

const Div = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fbfbfb;
`;
