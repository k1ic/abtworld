import React, { useEffect } from 'react';
import styled from 'styled-components';
import useAsync from 'react-use/lib/useAsync';
import useToggle from 'react-use/lib/useToggle';
import qs from 'querystring';
import { fromUnitToToken } from '@arcblock/forge-util';

import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Auth from '@arcblock/did-react/lib/Auth';
import Avatar from '@arcblock/did-react/lib/Avatar';

import Layout from '../components/layout';
import useForUpdateSession from '../hooks/session';
import api from '../libs/api';
import AssetPicList from '../libs/asset_pic';

import { onAuthError } from '../libs/auth';
import { getPaymentPendingFlag, setPaymentPendigFlag } from '../libs/auth';

const isProduction = process.env.NODE_ENV === 'production';
//const isProduction = 0;

async function fetchStatus() {
  const [{ data: payment }, { data: session }] = await Promise.all([api.get('/api/payments'), api.get('/api/session')]);
  return { payment, session };
}

const onPaymentClose = async result => {
  setPaymentPendigFlag(0);
  window.location.href = '/';
};

const onPaymentError = async result => {
  setPaymentPendigFlag(0);
  window.location.href = '/';
};

const onPaymentSuccess = async result => {
  setPaymentPendigFlag(0);
  window.location.reload();

  //payback to resources owner
};

export default function PaymentPage() {
  const state = useAsync(fetchStatus);
  const [open, toggle] = useToggle(false);
  var memo = " ";
  var fValueToPay;
  var fValuePayed;
  var strValueToPay;
  var strValuePayed;
  var temp = null;
  
  if (state.loading || !state.value) {
    return (
      <Layout title="Payment">
        <Main>
          <CircularProgress />
        </Main>
      </Layout>
    );
  }

  if (state.error) {
    return (
      <Layout title="Payment">
        <Main>{state.error.message}</Main>
      </Layout>
    );
  }

  if (!state.value.session.user) {
    window.location.href = '/?openLogin=true';
    setPaymentPendigFlag(0);
    return null;
  }

  const {
    payment,
    session: { user, token },
  } = state.value;

  if (window.location.search) {
    const params = qs.parse(window.location.search.slice(1));
    try {
      if (params.memo) { 
        memo = params.memo;
      }
    } catch (err) {
      // Do nothing
    }
  }

  const pic_to_pay = AssetPicList.filter(function (e) { 
    return e.asset_did === memo;
  });
  if (pic_to_pay.length === 0){
    window.location.href = '/';
    setPaymentPendigFlag(0);
    return null;
  }
  fValueToPay = parseFloat(pic_to_pay[0].worth);
  
  if(state.value.payment && state.value.payment.length >= 1) {
    const payment_filter = state.value.payment.filter(function (e) { 
      if(e.tx.itx.data){
          temp = e.tx.itx.data.value.replace(/\"/g, "");
          return temp === memo;
      }else{
          return 0;
      }
    });
    const payment_data = (payment_filter.length > 0) ? payment_filter : null;
    fValuePayed = 0;
    if (payment_data) {
      payment_data.map(function( e ) {
        fValuePayed = fValuePayed + parseFloat(fromUnitToToken(e.tx.itx.value, token.decimal));
      });
    }
    strValuePayed = String(fValuePayed);
  }else{
    fValuePayed = 0;
    strValuePayed = null; 
  }

  if(fValueToPay > fValuePayed){
    fValueToPay = fValueToPay - fValuePayed;
    fValueToPay = fValueToPay.toFixed(6);
    strValueToPay = String(fValueToPay);
  }else{
    fValueToPay = 0;
    strValueToPay = null;
    setPaymentPendigFlag(0);
  }

  //asset owner and super admin don't need to pay in production release
  if (isProduction && (user.did == pic_to_pay[0].owner_did || user.did == 'did:abt:z1emeg4eeh55Epfdz1bV3jhC9VxQ35H5yPb')){
    fValueToPay = 0;
    strValueToPay = null;
    setPaymentPendigFlag(0);
  }

  //picture file to display
  const pic_to_preview = "/static/images/20190930094558.jpg";
  const pic_to_show = (fValueToPay > 0) ? pic_to_preview : pic_to_pay[0].hd_src;

  setTimeout(() => {
    try {
      if (fValueToPay > 0 && getPaymentPendingFlag() == 0){
        setPaymentPendigFlag(1);
        toggle(true);
      }
    } catch (err) {
      // Do nothing
    }
  }, 100);
 
  return (
    <Layout title="Payment">
      <Main symbol={token.symbol}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={9} className="meta">
            <Typography component="h3" variant="h4" color="primary">
              {pic_to_pay[0].owner} - {pic_to_pay[0].title} - {pic_to_pay[0].worth} {pic_to_pay[0].token_sym} <br/>
              {pic_to_pay[0].description}
            </Typography>
            <div className={`document ${(fValueToPay > 0) ? '' : 'picture--unlocked'}`}>
              <Typography component="div" variant="body1" className="picture__body">
                <img src={pic_to_show} alt={pic_to_pay[0].title} />
              </Typography>
            </div>
          </Grid>
        </Grid>
      </Main>
      {open && (
        <Auth
          responsive
          action="payment"
          locale="zh"
          checkFn={api.get}
          onError={onPaymentError}
          onClose={onPaymentClose}
          onSuccess={onPaymentSuccess}
          extraParams={ "zh", { strValueToPay,  memo } }
          messages={{
            title: '支付需求',
            scan: `该内容需支付 ${strValueToPay} ${token.symbol}`,
            confirm: '在ABT钱包中确认',
            success: '支付成功!',
          }}
        />
      )}
    </Layout>
  );
}

const Main = styled.main`
  margin: 80px 0;
  display: flex;

  .avatar {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-center;

    svg {
      margin-bottom: 40px;
    }
  }

  .meta {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .meta-item {
    padding-left: 0;
  }

  .document {
    margin-top: 30px;
    position: relative;

    .document__body {
      filter: blur(5px);
      text-align: justify;
      user-select: none;
      pointer-event: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    .picture__body {
      filter: blur(30px);
      pointer-event:none;-webkit-user-select:none;-moz-user-select:none;user-select:none;
    }

    &:after {
      color: #dd2233;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
        'Helvetica Neue', sans-serif;
      content: '';
      font-size: 30px;
      line-height: 0px;
      border-radius: 0px;
      padding: 0px;
      font-weight: bold;
      position: absolute;
      text-transform: uppercase;
      animation: blink 800ms ease;
      border: 0px;
      top: 0%;
      left: 0%;
      width: 100%;
      height: 100%;
    }

    @keyframes blink {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }

  .document--unlocked {
    .document__body {
      filter: none;  
    }

    &:after {
      display: none;
    }
  }

  .picture--unlocked {
    .picture__body {
      filter: none;
    }
    
    &:after {
    }
  }

`;
